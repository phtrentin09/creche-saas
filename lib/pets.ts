import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { comTenant } from "@/lib/tenant";

export type DadosPet = {
  nome: string;
  raca: string | null;
  porte: string | null;
  castrado: boolean;
  observacoes: string | null;
  fotoUrl: string | null;
};

export async function buscarPet(tenantId: string, petId: string) {
  return prisma.pet.findFirst({
    where: comTenant(tenantId, { id: petId }),
  });
}

export async function criarPet(
  tenantId: string,
  tutorId: string,
  dados: DadosPet,
) {
  const tutor = await prisma.tutor.findFirst({
    where: comTenant(tenantId, { id: tutorId }),
  });
  if (!tutor) {
    throw new Error("Tutor não encontrado.");
  }

  return prisma.pet.create({
    data: { ...dados, tenantId, tutorId },
  });
}

// updateMany/deleteMany de propósito: ver comentário em lib/tutores.ts.
export async function atualizarPet(
  tenantId: string,
  petId: string,
  dados: Partial<DadosPet>,
) {
  const { count } = await prisma.pet.updateMany({
    where: comTenant(tenantId, { id: petId }),
    data: dados,
  });
  if (count === 0) {
    throw new Error("Pet não encontrado.");
  }
}

export async function excluirPet(tenantId: string, petId: string) {
  // Assinatura/Agendamento/Vacina -> Pet são RESTRICT: se houver histórico
  // vinculado, o Postgres barra a exclusão (nada é apagado, P2003 aqui).
  try {
    const { count } = await prisma.pet.deleteMany({
      where: comTenant(tenantId, { id: petId }),
    });
    if (count === 0) {
      throw new Error("Pet não encontrado.");
    }
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") {
      throw new Error(
        "Não é possível excluir: este pet tem cobranças, assinaturas ou agendamentos vinculados.",
      );
    }
    throw erro;
  }
}
