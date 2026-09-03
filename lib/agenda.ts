import { prisma } from "@/lib/prisma";
import { buscarTenantAtual, comTenant } from "@/lib/tenant";

function limitesDoDia(data: Date) {
  const inicio = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()),
  );
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { inicio, fim };
}

export async function listarAgendamentosDoDia(tenantId: string, data: Date) {
  const { inicio, fim } = limitesDoDia(data);
  return prisma.agendamento.findMany({
    where: comTenant(tenantId, { data: { gte: inicio, lt: fim } }),
    include: { pet: { include: { tutor: true } } },
    orderBy: { pet: { nome: "asc" } },
  });
}

export async function buscarPetsParaAgendar(tenantId: string, busca: string) {
  return prisma.pet.findMany({
    where: comTenant(tenantId, {
      OR: busca
        ? [
            { nome: { contains: busca, mode: "insensitive" as const } },
            { tutor: { nome: { contains: busca, mode: "insensitive" as const } } },
          ]
        : undefined,
    }),
    include: { tutor: true },
    orderBy: { nome: "asc" },
    take: 30,
  });
}

export async function criarAgendamento(tenantId: string, petId: string, data: Date) {
  const { inicio, fim } = limitesDoDia(data);

  const pet = await prisma.pet.findFirst({
    where: comTenant(tenantId, { id: petId }),
  });
  if (!pet) {
    throw new Error("Pet não encontrado.");
  }

  const tenant = await buscarTenantAtual(tenantId);

  return prisma.$transaction(async (tx) => {
    const jaAgendado = await tx.agendamento.findFirst({
      where: { tenantId, petId, data: { gte: inicio, lt: fim } },
    });
    if (jaAgendado) {
      throw new Error("Esse pet já está na agenda desse dia.");
    }

    const ocupados = await tx.agendamento.count({
      where: { tenantId, data: { gte: inicio, lt: fim }, status: { not: "falta" } },
    });
    if (ocupados >= tenant.capacidadeDiaria) {
      throw new Error("Capacidade diária lotada para esse dia.");
    }

    return tx.agendamento.create({
      data: { tenantId, petId, data: inicio, status: "agendado" },
    });
  });
}

// updateMany/deleteMany de propósito: ver comentário em lib/tutores.ts.
export async function registrarCheckIn(tenantId: string, agendamentoId: string) {
  const { count } = await prisma.agendamento.updateMany({
    where: comTenant(tenantId, { id: agendamentoId }),
    data: { status: "presente", checkInEm: new Date() },
  });
  if (count === 0) {
    throw new Error("Agendamento não encontrado.");
  }
}

export async function registrarCheckOut(tenantId: string, agendamentoId: string) {
  const { count } = await prisma.agendamento.updateMany({
    where: comTenant(tenantId, { id: agendamentoId }),
    data: { status: "saiu", checkOutEm: new Date() },
  });
  if (count === 0) {
    throw new Error("Agendamento não encontrado.");
  }
}

export async function marcarFalta(tenantId: string, agendamentoId: string) {
  const { count } = await prisma.agendamento.updateMany({
    where: comTenant(tenantId, { id: agendamentoId }),
    data: { status: "falta" },
  });
  if (count === 0) {
    throw new Error("Agendamento não encontrado.");
  }
}

export async function excluirAgendamento(tenantId: string, agendamentoId: string) {
  const { count } = await prisma.agendamento.deleteMany({
    where: comTenant(tenantId, { id: agendamentoId }),
  });
  if (count === 0) {
    throw new Error("Agendamento não encontrado.");
  }
}
