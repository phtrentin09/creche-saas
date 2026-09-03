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
