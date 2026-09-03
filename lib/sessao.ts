import { auth } from "@/lib/auth";

export class NaoAutenticadoError extends Error {
  constructor() {
    super("Não autenticado.");
    this.name = "NaoAutenticadoError";
  }
}

/**
 * Toda Server Action que toca no banco chama isso primeiro. O proxy.ts só
 * redireciona quem não está logado para /login — ele não é a camada de
 * autorização, então essa checagem não pode depender só dele.
 */
export async function usuarioDaSessao() {
  const sessao = await auth();
  if (!sessao?.user) {
    throw new NaoAutenticadoError();
  }
  return sessao.user;
}

export async function tenantIdDaSessao(): Promise<string> {
  const usuario = await usuarioDaSessao();
  // Checagem em runtime, não só no tipo: o Prisma ignora chaves `undefined`
  // num where, então um tenantId ausente removeria o filtro silenciosamente
  // em vez de dar erro. Isso não deveria acontecer (login sempre seta os
  // dois campos no token), mas se acontecer é melhor barrar aqui.
  if (!usuario.tenantId) {
    throw new NaoAutenticadoError();
  }
  return usuario.tenantId;
}

export class SemPermissaoError extends Error {
  constructor() {
    super("Você não tem permissão para acessar isso.");
    this.name = "SemPermissaoError";
  }
}

/**
 * Planos e assinaturas são financeiro — atendente não acessa (ver perfis
 * de usuário no CLAUDE.md). Agenda é dos dois papéis, então essa checagem
 * não entra em lib/agenda.ts.
 */
export async function tenantIdDoDono(): Promise<string> {
  const usuario = await usuarioDaSessao();
  if (!usuario.tenantId) {
    throw new NaoAutenticadoError();
  }
  if (usuario.papel !== "dono") {
    throw new SemPermissaoError();
  }
  return usuario.tenantId;
}
