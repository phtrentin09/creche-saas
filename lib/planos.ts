import { Prisma, type TipoPlano } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { comTenant } from "@/lib/tenant";

export type DadosPlano = {
  nome: string;
  tipo: TipoPlano;
  valorCentavos: number;
  qtdDiarias: number | null;
  diaVencimento: number | null;
};

export async function listarPlanos(tenantId: string) {
  return prisma.plano.findMany({
    where: comTenant(tenantId),
    orderBy: { nome: "asc" },
  });
}

export async function buscarPlano(tenantId: string, planoId: string) {
  return prisma.plano.findFirst({
    where: comTenant(tenantId, { id: planoId }),
  });
}

export async function criarPlano(tenantId: string, dados: DadosPlano) {
  return prisma.plano.create({
    data: { ...dados, tenantId },
  });
}

// updateMany/deleteMany de propósito: ver comentário em lib/tutores.ts.
export async function atualizarPlano(
  tenantId: string,
  planoId: string,
  dados: Partial<DadosPlano>,
) {
  const { count } = await prisma.plano.updateMany({
    where: comTenant(tenantId, { id: planoId }),
    data: dados,
  });
  if (count === 0) {
    throw new Error("Plano não encontrado.");
  }
}

export async function excluirPlano(tenantId: string, planoId: string) {
  try {
    const { count } = await prisma.plano.deleteMany({
      where: comTenant(tenantId, { id: planoId }),
    });
    if (count === 0) {
      throw new Error("Plano não encontrado.");
    }
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") {
      throw new Error(
        "Não é possível excluir: este plano tem assinaturas vinculadas.",
      );
    }
    throw erro;
  }
}
