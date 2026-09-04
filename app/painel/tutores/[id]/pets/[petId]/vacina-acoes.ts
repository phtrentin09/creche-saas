"use server";

import { revalidatePath } from "next/cache";
import { tenantIdDaSessao } from "@/lib/sessao";
import { dataDeStringISO } from "@/lib/formatacao";
import { atualizarVacina, criarVacina, excluirVacina } from "@/lib/vacinas";

export type EstadoVacina = { erro?: string };

function caminhoPet(tutorId: string, petId: string) {
  return `/painel/tutores/${tutorId}/pets/${petId}`;
}

function dadosDoFormulario(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const aplicadaEmISO = String(formData.get("aplicadaEm") ?? "");
  const venceEmISO = String(formData.get("venceEm") ?? "");

  if (!tipo) return { erro: "Informe o tipo da vacina." } as const;
  if (!aplicadaEmISO) return { erro: "Informe a data de aplicação." } as const;
  if (!venceEmISO) return { erro: "Informe a data de vencimento." } as const;

  return {
    dados: {
      tipo,
      aplicadaEm: dataDeStringISO(aplicadaEmISO),
      venceEm: dataDeStringISO(venceEmISO),
    },
  } as const;
}

export async function criarVacinaAction(
  tutorId: string,
  petId: string,
  _estadoAnterior: EstadoVacina,
  formData: FormData,
): Promise<EstadoVacina> {
  const tenantId = await tenantIdDaSessao();

  const resultado = dadosDoFormulario(formData);
  if ("erro" in resultado) return { erro: resultado.erro };

  try {
    await criarVacina(tenantId, petId, resultado.dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao cadastrar vacina." };
  }

  revalidatePath(caminhoPet(tutorId, petId));
  return {};
}

export async function atualizarVacinaAction(
  tutorId: string,
  petId: string,
  vacinaId: string,
  _estadoAnterior: EstadoVacina,
  formData: FormData,
): Promise<EstadoVacina> {
  const tenantId = await tenantIdDaSessao();

  const resultado = dadosDoFormulario(formData);
  if ("erro" in resultado) return { erro: resultado.erro };

  try {
    await atualizarVacina(tenantId, vacinaId, resultado.dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao atualizar vacina." };
  }

  revalidatePath(caminhoPet(tutorId, petId));
  return {};
}

export async function excluirVacinaAction(
  tutorId: string,
  petId: string,
  vacinaId: string,
  _estadoAnterior: EstadoVacina,
  _formData: FormData,
): Promise<EstadoVacina> {
  const tenantId = await tenantIdDaSessao();

  try {
    await excluirVacina(tenantId, vacinaId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao excluir vacina." };
  }

  revalidatePath(caminhoPet(tutorId, petId));
  return {};
}
