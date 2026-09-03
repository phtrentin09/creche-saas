import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { processarEventoWebhook } from "@/lib/webhooks";

/**
 * Prova a regra do CLAUDE.md: "Ao confirmar pagamento de plano tipo
 * pacote, creditar qtdDiarias em assinatura.saldoDiarias — uma única
 * vez, mesmo com evento duplicado." Dispara o MESMO evento (mesmo id)
 * duas vezes, direto na função que a rota do webhook chama — sem
 * precisar de rede real (a AbacatePay não entrega webhook pra
 * localhost).
 */
describe("idempotência do webhook — não credita diárias em dobro", () => {
  const sufixo = randomUUID();
  const eventoId = `log_teste_${sufixo}`;

  let tenant: { id: string };
  let assinatura: { id: string; saldoDiarias: number };
  let cobranca: { id: string };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: { nome: `Tenant Webhook ${sufixo}`, capacidadeDiaria: 10 },
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
        nome: "Pacote 10 Diarias",
        tipo: "pacote",
        valorCentavos: 28000,
        qtdDiarias: 10,
      },
    });

    assinatura = await prisma.assinatura.create({
      data: {
        tenantId: tenant.id,
        petId: pet.id,
        planoId: plano.id,
        status: "ativa",
        saldoDiarias: 0,
      },
    });

    cobranca = await prisma.cobranca.create({
      data: {
        tenantId: tenant.id,
        assinaturaId: assinatura.id,
        competencia: new Date(),
        vencimento: new Date(),
        valorCentavos: 28000,
        status: "pendente",
        token: `token_teste_${sufixo}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.eventoWebhook.deleteMany({ where: { provedorEventoId: eventoId } });
    await prisma.cobranca.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.assinatura.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.plano.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.pet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tutor.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
    await prisma.$disconnect();
  });

  function payloadEvento() {
    return {
      id: eventoId,
      event: "checkout.completed",
      apiVersion: 2,
      devMode: true,
      data: { id: "bill_teste", externalId: cobranca.id },
    };
  }

  it("primeira vez: marca paga e credita as diárias do pacote", async () => {
    const resultado = await processarEventoWebhook(payloadEvento());
    expect(resultado).toEqual({ status: "processado", cobrancaId: cobranca.id });

    const cobrancaAtualizada = await prisma.cobranca.findUniqueOrThrow({
      where: { id: cobranca.id },
    });
    expect(cobrancaAtualizada.status).toBe("paga");
    expect(cobrancaAtualizada.pagoEm).not.toBeNull();

    const assinaturaAtualizada = await prisma.assinatura.findUniqueOrThrow({
      where: { id: assinatura.id },
    });
    expect(assinaturaAtualizada.saldoDiarias).toBe(10);
  });

  it("segunda vez, MESMO evento: não credita de novo", async () => {
    const resultado = await processarEventoWebhook(payloadEvento());
    expect(resultado).toEqual({ status: "duplicado" });

    const assinaturaAtualizada = await prisma.assinatura.findUniqueOrThrow({
      where: { id: assinatura.id },
    });
    // O ponto central do teste: continua 10, não virou 20.
    expect(assinaturaAtualizada.saldoDiarias).toBe(10);

    const eventos = await prisma.eventoWebhook.findMany({
      where: { provedorEventoId: eventoId },
    });
    expect(eventos).toHaveLength(1);
  });
});
