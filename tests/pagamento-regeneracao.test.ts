import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock precisa vir antes do import de lib/cobrancas.ts, que é quem
// chama essas funções — vitest hoisteia isso automaticamente pro topo
// do arquivo. Não bate contra a API real do AbacatePay de propósito
// (não dá pra forçar um checkout a expirar em modo Dev pra testar isso
// ao vivo) — prova só que a LÓGICA DE DECISÃO está certa: EXPIRED (ou
// CANCELLED) tem que regenerar, não travar num link morto.
vi.mock("@/lib/abacatepay", async (importarOriginal) => {
  const original = await importarOriginal<typeof import("@/lib/abacatepay")>();
  return {
    ...original,
    buscarCheckout: vi.fn(),
    criarCobrancaNoAbacatePay: vi.fn(),
  };
});

import { buscarCheckout, criarCobrancaNoAbacatePay, type Checkout } from "@/lib/abacatepay";
import { criptografar } from "@/lib/criptografia";
import { urlPagamentoValida } from "@/lib/cobrancas";
import { prisma } from "@/lib/prisma";

describe("urlPagamentoValida — regenera quando o checkout não está mais válido", () => {
  const sufixo = randomUUID();

  let tenant: { id: string };
  let cobranca: { id: string };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: {
        nome: `Tenant Regeneracao ${sufixo}`,
        capacidadeDiaria: 10,
        chaveApiAbacate: criptografar("chave-fake-de-teste"),
      },
    });

    const tutor = await prisma.tutor.create({
      data: { tenantId: tenant.id, nome: "Tutor", telefone: "11900000000" },
    });
    const pet = await prisma.pet.create({
      data: { tenantId: tenant.id, tutorId: tutor.id, nome: "Pet", castrado: false },
    });
    const plano = await prisma.plano.create({
      data: {
        tenantId: tenant.id,
        nome: "Pacote Teste",
        tipo: "pacote",
        valorCentavos: 15000,
        qtdDiarias: 5,
      },
    });
    const assinatura = await prisma.assinatura.create({
      data: { tenantId: tenant.id, petId: pet.id, planoId: plano.id, status: "ativa" },
    });

    cobranca = await prisma.cobranca.create({
      data: {
        tenantId: tenant.id,
        assinaturaId: assinatura.id,
        competencia: new Date(),
        vencimento: new Date(),
        valorCentavos: 15000,
        status: "pendente",
        token: `token_regen_${sufixo}`,
        abacateBillingId: "bill_antigo_expirado",
        urlPagamento: "https://app.abacatepay.com/pay/bill_antigo_expirado",
      },
    });
  });

  afterAll(async () => {
    await prisma.cobranca.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.assinatura.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.plano.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.pet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tutor.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
    await prisma.$disconnect();
  });

  it("checkout EXPIRED: consulta ao vivo, vê que não serve mais, gera um novo", async () => {
    vi.mocked(buscarCheckout).mockResolvedValueOnce({
      id: "bill_antigo_expirado",
      externalId: cobranca.id,
      url: "https://app.abacatepay.com/pay/bill_antigo_expirado",
      amount: 15000,
      status: "EXPIRED",
      devMode: true,
    } satisfies Checkout);

    vi.mocked(criarCobrancaNoAbacatePay).mockResolvedValueOnce({
      billingId: "bill_novo_regenerado",
      urlPagamento: "https://app.abacatepay.com/pay/bill_novo_regenerado",
    });

    const resultado = await urlPagamentoValida(cobranca.id);

    expect(buscarCheckout).toHaveBeenCalledWith("chave-fake-de-teste", "bill_antigo_expirado");
    expect(criarCobrancaNoAbacatePay).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({
      urlPagamento: "https://app.abacatepay.com/pay/bill_novo_regenerado",
      paga: false,
    });

    const cobrancaAtualizada = await prisma.cobranca.findUniqueOrThrow({
      where: { id: cobranca.id },
    });
    expect(cobrancaAtualizada.abacateBillingId).toBe("bill_novo_regenerado");
    expect(cobrancaAtualizada.urlPagamento).toBe(
      "https://app.abacatepay.com/pay/bill_novo_regenerado",
    );
    // Regenerar não é pagar — só o webhook (ou detectar PAID ao vivo) confirma isso.
    expect(cobrancaAtualizada.status).toBe("pendente");
  });
});
