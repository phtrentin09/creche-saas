import { prisma } from "@/lib/prisma";

/**
 * Golden rule do projeto: toda query ao banco precisa ser filtrada por tenantId.
 * Use este helper para montar o `where` em vez de escrever `tenantId` na mão em
 * cada query — assim fica impossível esquecer o filtro.
 */
export function comTenant<T extends Record<string, unknown>>(
  tenantId: string,
  filtro: T = {} as T,
): T & { tenantId: string } {
  return { ...filtro, tenantId };
}

// Tenant não tem tenantId (o próprio id É o tenant) — buscar pelo id da
// sessão já é seguro, não precisa de comTenant aqui.
export async function buscarTenantAtual(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    // Sessão aponta pra um tenant que não existe mais (ex: banco resetado
    // com sessões ainda ativas). Não deveria acontecer em uso normal, mas
    // se acontecer é melhor uma mensagem amigável do que o erro cru do
    // Prisma vazando pro error.tsx. Erro genérico de propósito, não
    // NaoAutenticadoError de lib/sessao.ts — importar isso aqui arrastaria
    // o Auth.js (e next/server) pra dentro de todo módulo que usa
    // comTenant, quebrando os testes, que rodam fora do Next.js.
    throw new Error("Sessão inválida. Faça login de novo.");
  }
  return tenant;
}
