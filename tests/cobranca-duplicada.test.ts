import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock pra não bater na API real do AbacatePay — só a lógica de bloqueio
// importa aqui, não a criação de verdade.
vi.mock("@/lib/abacatepay", async (importarOriginal) => {
  const original = await importarOriginal<typeof import("@/lib/abacatepay")>();
  return {
    ...original,
    criarCobrancaNoAbacatePay: vi.fn(),
  };
});

import { criarCobrancaNoAbacatePay } from "@/lib/abacatepay";
import { cobrarPacote } from "@/lib/cobrancas";
import { criptografar } from "@/lib/criptografia";
import { prisma } from "@/lib/prisma";

/**
 * Prova o fix: clicar "Cobrar pacote" duas vezes pra mesma assinatura não
 * pode gerar duas cobranças em aberto — foi exatamente isso que gerou as
 * cobranças fantasma do Rex.
 */
describe("cobrarPacote — trava duplicata pra mesma assinatura", () => {
  const sufixo = randomUUID();

  let tenant: { id: string };
  let assinatura: { id: string };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: {
        nome: `Tenant Duplicata ${sufixo}`,
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
        valorCentavos: 28000,
        qtdDiarias: 10,
      },
    });
    assinatura = await prisma.assinatura.create({
      data: { tenantId: tenant.id, petId: pet.id, planoId: plano.id, status: "ativa" },
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

  it("primeira cobrança: cria normalmente", async () => {
    vi.mocked(criarCobrancaNoAbacatePay).mockResolvedValueOnce({
      billingId: "bill_1",
      urlPagamento: "https://app.abacatepay.com/pay/bill_1",
    });

    const cobranca = await cobrarPacote(tenant.id, assinatura.id);

    expect(cobranca.status).toBe("pendente");
    expect(criarCobrancaNoAbacatePay).toHaveBeenCalledTimes(1);
  });

  it("segunda tentativa, mesma assinatura: bloqueia sem chamar a AbacatePay de novo", async () => {
    await expect(cobrarPacote(tenant.id, assinatura.id)).rejects.toThrow(
      "Já existe uma cobrança em aberto",
    );

    // Não gerou uma segunda cobrança nem uma segunda chamada à API.
    expect(criarCobrancaNoAbacatePay).toHaveBeenCalledTimes(1);
    const cobrancas = await prisma.cobranca.findMany({ where: { assinaturaId: assinatura.id } });
    expect(cobrancas).toHaveLength(1);
  });
});
