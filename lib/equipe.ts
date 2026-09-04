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
 * troca de e-mail. Recuperação de senha do atendente: ver
 * redefinirSenhaAtendente, abaixo.
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

/**
 * "Recuperação de senha" da v1, sem serviço de e-mail: o dono redefine
 * na mão, pela tela de Equipe, e entrega a senha nova pessoalmente —
 * mesmo modelo de confiança de criarAtendente. Só atendente, de
 * propósito: `papel: "atendente"` no where barra tentativa de redefinir
 * senha de outro dono (inclusive o próprio). Se o DONO esquecer a
 * própria senha, hoje só via script direto no banco — não documentado
 * na UI porque não existe UI pra isso ainda (ver PENDENCIAS.md).
 */
export async function redefinirSenhaAtendente(
  tenantId: string,
  usuarioId: string,
  novaSenha: string,
) {
  const senhaHash = await hash(novaSenha, 12);

  const { count } = await prisma.usuario.updateMany({
    where: comTenant<Prisma.UsuarioWhereInput>(tenantId, { id: usuarioId, papel: "atendente" }),
    data: { senhaHash },
  });
  if (count === 0) {
    throw new Error("Atendente não encontrado.");
  }
}
