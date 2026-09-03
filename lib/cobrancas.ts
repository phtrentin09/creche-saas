/**
 * Placeholder até a etapa de cobrança (etapa 4). Hoje sempre retorna
 * false porque ainda não existe lógica real de cobrança vencida — não é
 * pra inventar dado na agenda. Quando a etapa 4 existir, troca isso por
 * uma query real em Cobranca (status = vencida, ou pendente com
 * vencimento no passado) para o pet informado.
 */
export async function temMensalidadeEmAtraso(
  _tenantId: string,
  _petId: string,
): Promise<boolean> {
  return false;
}
