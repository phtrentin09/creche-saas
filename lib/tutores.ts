import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { comTenant } from "@/lib/tenant";

export type DadosTutor = {
  nome: string;
  telefone: string;
  cpf: string | null;
  email: string | null;
};

export async function listarTutores(tenantId: string) {
  return prisma.tutor.findMany({
    where: comTenant(tenantId),
    include: { _count: { select: { pets: true } } },
    orderBy: { nome: "asc" },
  });
}

export async function buscarTutor(tenantId: string, tutorId: string) {
  return prisma.tutor.findFirst({
    where: comTenant(tenantId, { id: tutorId }),
    include: { pets: { orderBy: { nome: "asc" } } },
  });
}

export async function criarTutor(tenantId: string, dados: DadosTutor) {
  try {
    return await prisma.tutor.create({
      data: { ...dados, tenantId },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      throw new Error("Já existe um tutor com esse CPF.");
    }
    throw erro;
  }
}

// updateMany/deleteMany (não update/delete) de propósito: id sozinho não
// garante o tenant, só a combinação id + tenantId no where garante.
export async function atualizarTutor(
  tenantId: string,
  tutorId: string,
  dados: Partial<DadosTutor>,
) {
  const { count } = await prisma.tutor.updateMany({
    where: comTenant(tenantId, { id: tutorId }),
    data: dados,
  });
  if (count === 0) {
    throw new Error("Tutor não encontrado.");
  }
}

export async function excluirTutor(tenantId: string, tutorId: string) {
  // Pet -> Tutor é ON DELETE CASCADE, mas Assinatura/Agendamento/Vacina -> Pet
  // são NoAction: se algum pet desse tutor tiver histórico financeiro ou de
  // agenda, o Postgres barra a exclusão inteira (nada é apagado, P2003 aqui).
  // Decisão pendente: quando a etapa de financeiro existir, trocar essa
  // exclusão por arquivamento (campo `ativo: false` no Tutor) em vez de
  // depender só dessa trava do banco.
  try {
    const { count } = await prisma.tutor.deleteMany({
      where: comTenant(tenantId, { id: tutorId }),
    });
    if (count === 0) {
      throw new Error("Tutor não encontrado.");
    }
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") {
      throw new Error(
        "Não é possível excluir: este tutor tem pets com cobranças, assinaturas ou agendamentos vinculados.",
      );
    }
    throw erro;
  }
}
