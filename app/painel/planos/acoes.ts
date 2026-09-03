"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TipoPlano } from "@/lib/generated/prisma";
import { tenantIdDoDono } from "@/lib/sessao";
import {
  atualizarPlano,
  criarPlano,
  excluirPlano,
  type DadosPlano,
} from "@/lib/planos";

export type EstadoPlano = { erro?: string };

function lerDadosPlano(formData: FormData): DadosPlano | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const valorReais = String(formData.get("valorReais") ?? "").replace(",", ".");
  const valorCentavos = Math.round(parseFloat(valorReais) * 100);

  if (!nome) return { erro: "Informe o nome do plano." };
  if (tipo !== "mensal" && tipo !== "pacote") {
    return { erro: "Selecione o tipo do plano." };
  }
  if (!Number.isFinite(valorCentavos) || valorCentavos <= 0) {
    return { erro: "Informe um valor válido." };
  }

  if (tipo === "mensal") {
    const diaVencimento = Number(formData.get("diaVencimento"));
    if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) {
      return { erro: "Dia de vencimento precisa ser um número entre 1 e 31." };
    }
    return { nome, tipo: tipo as TipoPlano, valorCentavos, diaVencimento, qtdDiarias: null };
  }

  const qtdDiarias = Number(formData.get("qtdDiarias"));
  if (!Number.isInteger(qtdDiarias) || qtdDiarias <= 0) {
    return {
      erro: "Quantidade de diárias precisa ser um número inteiro maior que zero.",
    };
  }
  return { nome, tipo: tipo as TipoPlano, valorCentavos, qtdDiarias, diaVencimento: null };
}

export async function criarPlanoAction(
  _estadoAnterior: EstadoPlano,
  formData: FormData,
): Promise<EstadoPlano> {
  const tenantId = await tenantIdDoDono();
  const dados = lerDadosPlano(formData);
  if ("erro" in dados) return dados;

  try {
    await criarPlano(tenantId, dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao criar plano." };
  }

  revalidatePath("/painel/planos");
  redirect("/painel/planos");
}

export async function atualizarPlanoAction(
  planoId: string,
  _estadoAnterior: EstadoPlano,
  formData: FormData,
): Promise<EstadoPlano> {
  const tenantId = await tenantIdDoDono();
  const dados = lerDadosPlano(formData);
  if ("erro" in dados) return dados;

  try {
    await atualizarPlano(tenantId, planoId, dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao salvar plano." };
  }

  revalidatePath("/painel/planos");
  redirect("/painel/planos");
}

export async function excluirPlanoAction(
  planoId: string,
  _estadoAnterior: EstadoPlano,
  _formData: FormData,
): Promise<EstadoPlano> {
  const tenantId = await tenantIdDoDono();

  try {
    await excluirPlano(tenantId, planoId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao excluir plano." };
  }

  revalidatePath("/painel/planos");
  redirect("/painel/planos");
}
