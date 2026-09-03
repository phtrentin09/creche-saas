import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarAgendamento, marcarFalta } from "@/lib/agenda";
import { dataDeStringISO } from "@/lib/formatacao";
import { prisma } from "@/lib/prisma";

describe("capacidade diária da agenda", () => {
  const sufixo = randomUUID();
  const dia = dataDeStringISO("2026-10-01");

  let tenant: { id: string };
  let petA: { id: string };
  let petB: { id: string };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: { nome: `Tenant Capacidade ${sufixo}`, capacidadeDiaria: 1 },
    });

    const tutor = await prisma.tutor.create({
      data: { tenantId: tenant.id, nome: "Tutor", telefone: "11900000000" },
    });

    petA = await prisma.pet.create({
      data: { tenantId: tenant.id, tutorId: tutor.id, nome: "Pet A", castrado: false },
    });
    petB = await prisma.pet.create({
      data: { tenantId: tenant.id, tutorId: tutor.id, nome: "Pet B", castrado: false },
    });
  });

  afterAll(async () => {
    await prisma.agendamento.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.pet.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tutor.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
    await prisma.$disconnect();
  });

  it("bloqueia um segundo agendamento quando a capacidade diária já foi atingida", async () => {
    await criarAgendamento(tenant.id, petA.id, dia);

    await expect(criarAgendamento(tenant.id, petB.id, dia)).rejects.toThrow(
      "Capacidade diária lotada para esse dia.",
    );
  });

  it("não deixa agendar o mesmo pet duas vezes no mesmo dia", async () => {
    await expect(criarAgendamento(tenant.id, petA.id, dia)).rejects.toThrow(
      "Esse pet já está na agenda desse dia.",
    );
  });

  it("falta não ocupa vaga — libera capacidade pra outro pet", async () => {
    const agendamentoA = await prisma.agendamento.findFirstOrThrow({
      where: { tenantId: tenant.id, petId: petA.id },
    });
    await marcarFalta(tenant.id, agendamentoA.id);

    const agendamentoB = await criarAgendamento(tenant.id, petB.id, dia);
    expect(agendamentoB.petId).toBe(petB.id);
  });
});
