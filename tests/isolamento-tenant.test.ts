import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { atualizarPet, buscarPet, excluirPet } from "@/lib/pets";

/**
 * Prova a golden rule do projeto: um tenant nunca lê nem edita dado de
 * outro tenant. Testa direto em lib/pets.ts, que é a camada que toda
 * Server Action chama depois de resolver o tenantId da sessão — é onde
 * o isolamento de fato acontece (comTenant no where).
 */
describe("isolamento entre tenants — pets", () => {
  const sufixo = randomUUID();

  let tenantA: { id: string };
  let tenantB: { id: string };
  let petB: { id: string; nome: string };

  beforeAll(async () => {
    tenantA = await prisma.tenant.create({
      data: { nome: `Tenant A ${sufixo}`, capacidadeDiaria: 10 },
    });
    tenantB = await prisma.tenant.create({
      data: { nome: `Tenant B ${sufixo}`, capacidadeDiaria: 10 },
    });

    const tutorB = await prisma.tutor.create({
      data: { tenantId: tenantB.id, nome: "Tutor B", telefone: "11900000000" },
    });

    petB = await prisma.pet.create({
      data: {
        tenantId: tenantB.id,
        tutorId: tutorB.id,
        nome: "Pet B",
        castrado: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.pet.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await prisma.tutor.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.$disconnect();
  });

  it("tenant B lê o próprio pet (controle positivo)", async () => {
    const pet = await buscarPet(tenantB.id, petB.id);
    expect(pet?.id).toBe(petB.id);
  });

  it("tenant A não lê um pet do tenant B", async () => {
    const pet = await buscarPet(tenantA.id, petB.id);
    expect(pet).toBeNull();
  });

  it("tenant A não edita um pet do tenant B", async () => {
    await expect(
      atualizarPet(tenantA.id, petB.id, { nome: "Nome alterado por A" }),
    ).rejects.toThrow("Pet não encontrado.");

    const petInalterado = await buscarPet(tenantB.id, petB.id);
    expect(petInalterado?.nome).toBe("Pet B");
  });

  it("tenant A não exclui um pet do tenant B", async () => {
    await expect(excluirPet(tenantA.id, petB.id)).rejects.toThrow(
      "Pet não encontrado.",
    );

    const petAindaExiste = await buscarPet(tenantB.id, petB.id);
    expect(petAindaExiste).not.toBeNull();
  });
});
