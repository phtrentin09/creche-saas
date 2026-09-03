import { hash } from "bcryptjs";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { comTenant } from "@/lib/tenant";

export async function listarEquipe(tenantId: string) {
  return prisma.usuario.findMany({
    where: comTenant(tenantId),
    orderBy: { nome: "asc" },
  });
}

export type DadosAtendente = {
  nome: string;
  email: string;
  senha: string;
};

/**
 * Sem convite por e-mail, sem token: o dono digita a senha aqui e entrega
 * pessoalmente pro atendente. Escopo mínimo de propósito — v1 não tem
 * fluxo de recuperação de senha nem de troca de e-mail.
 */
export async function criarAtendente(tenantId: string, dados: DadosAtendente) {
  const senhaHash = await hash(dados.senha, 12);

  try {
    return await prisma.usuario.create({
      data: {
        tenantId,
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        papel: "atendente",
      },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      throw new Error("Já existe um usuário com esse e-mail.");
    }
    throw erro;
  }
}
