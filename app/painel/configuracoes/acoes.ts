"use server";

import { revalidatePath } from "next/cache";
import { salvarChaveAbacatePay } from "@/lib/configuracoes";
import { tenantIdDoDono } from "@/lib/sessao";

export type EstadoConfiguracoes = { erro?: string; sucesso?: boolean; aviso?: string };

export async function salvarChaveAction(
  _estadoAnterior: EstadoConfiguracoes,
  formData: FormData,
): Promise<EstadoConfiguracoes> {
  const tenantId = await tenantIdDoDono();
  const chave = String(formData.get("chaveApiAbacate") ?? "").trim();

  if (!chave) {
    return { erro: "Cole a chave de API do AbacatePay." };
  }

  let resultado: { aviso?: string };
  try {
    resultado = await salvarChaveAbacatePay(tenantId, chave);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao salvar a chave." };
  }

  revalidatePath("/painel/configuracoes");
  return { sucesso: true, aviso: resultado.aviso };
}
