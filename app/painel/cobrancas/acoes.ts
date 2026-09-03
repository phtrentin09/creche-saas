"use server";

import { revalidatePath } from "next/cache";
import { gerarCobrancasDoMes } from "@/lib/cobrancas";
import { tenantIdDoDono } from "@/lib/sessao";

export type EstadoCobrancas = { erro?: string; mensagem?: string };

export async function gerarCobrancasDoMesAction(
  _estadoAnterior: EstadoCobrancas,
  _formData: FormData,
): Promise<EstadoCobrancas> {
  const tenantId = await tenantIdDoDono();

  try {
    const resultado = await gerarCobrancasDoMes(tenantId);
    revalidatePath("/painel/cobrancas");

    const partes = [`${resultado.criadas} cobrança(s) criada(s)`];
    if (resultado.jaExistentes > 0) {
      partes.push(`${resultado.jaExistentes} já existiam`);
    }
    if (resultado.falhas.length > 0) {
      partes.push(`${resultado.falhas.length} falharam`);
    }

    return { mensagem: `${partes.join(", ")}.` };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao gerar cobranças." };
  }
}
