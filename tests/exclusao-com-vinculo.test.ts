import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { excluirPet } from "@/lib/pets";

/**
 * Cobre o caminho que hoje não dá pra testar manualmente na interface
 * (ainda não existe tela de assinatura — isso é a etapa 2). Quando essa
 * tela existir, dá pra repetir esse cenário na mão: criar uma assinatura
 * pro pet, clicar em Excluir no BotaoExcluir e ver a mensagem aparecer.
 */
describe("exclusão de pet com assinatura vinculada", () => {
  const sufixo = randomUUID();

  let tenant: { id: string };
  let pet: { id: string };
  let assinatura: { id: string };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: { nome: `Tenant Exclusao ${sufixo}`, capacidadeDiaria: 10 },
    });

    const tutor = await prisma.tutor.create({
      data: { tenantId: tenant.id, nome: "Tutor", telefone: "11900000000" },
    });

    pet = await prisma.pet.create({
      data: {
        tenantId: tenant.id,
        tutorId: tutor.id,
        nome: "Pet com assinatura",
        castrado: false,
      },
    });

    const plano = await prisma.plano.create({
      data: {
        tenantId: tenant.id,
        nome: "Plano",
        tipo: "mensal",
        valorCentavos: 10000,
        diaVencimento: 10,
      },
    });

    assinatura = await prisma.assinatura.create({
      data: { tenantId: tenant.id, petId: pet.id, planoId: plano.id },
    });
  });

  afterAll(async () => {
    await prisma.assinatura.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.plano.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.pet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tutor.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
    await prisma.$disconnect();
  });

  it("bloqueia a exclusão com mensagem amigável, sem apagar nada", async () => {
    await expect(excluirPet(tenant.id, pet.id)).rejects.toThrow(
      "Não é possível excluir: este pet tem cobranças, assinaturas ou agendamentos vinculados.",
    );

    const petAindaExiste = await prisma.pet.findUnique({ where: { id: pet.id } });
    expect(petAindaExiste).not.toBeNull();

    const assinaturaAindaExiste = await prisma.assinatura.findUnique({
      where: { id: assinatura.id },
    });
    expect(assinaturaAindaExiste).not.toBeNull();
  });
});
