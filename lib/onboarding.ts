import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type DadosCadastro = {
  nomeCreche: string;
  capacidadeDiaria: number;
  nomeDono: string;
  email: string;
  senha: string;
};

export class EmailJaCadastradoError extends Error {
  constructor() {
    super("Este e-mail já está cadastrado.");
    this.name = "EmailJaCadastradoError";
  }
}

/**
 * Cria um Tenant novo e o Usuario dono vinculado a ele. Sempre cria um
 * tenant novo — não existe caminho para vincular o cadastro a um tenant
 * já existente, a única checagem é o e-mail (único globalmente).
 */
export async function cadastrarCreche(dados: DadosCadastro) {
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });
  if (emailExistente) {
    throw new EmailJaCadastradoError();
  }

  const senhaHash = await hash(dados.senha, 12);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        nome: dados.nomeCreche,
        capacidadeDiaria: dados.capacidadeDiaria,
      },
    });

    const usuario = await tx.usuario.create({
      data: {
        tenantId: tenant.id,
        nome: dados.nomeDono,
        email: dados.email,
        senhaHash,
        papel: "dono",
      },
    });

    return { tenant, usuario };
  });
}
