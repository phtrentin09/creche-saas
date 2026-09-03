"use server";

import { revalidatePath } from "next/cache";
import type { StatusAssinatura } from "@/lib/generated/prisma";
import { tenantIdDoDono } from "@/lib/sessao";
import {
  ajustarSaldoDiarias,
  atualizarStatusAssinatura,
  criarAssinatura,
} from "@/lib/assinaturas";

export type EstadoAssinatura = { erro?: string };

function caminhoPet(tutorId: string, petId: string) {
  return `/painel/tutores/${tutorId}/pets/${petId}`;
}

export async function criarAssinaturaAction(
  tutorId: string,
  petId: string,
  _estadoAnterior: EstadoAssinatura,
  formData: FormData,
): Promise<EstadoAssinatura> {
  const tenantId = await tenantIdDoDono();
  const planoId = String(formData.get("planoId") ?? "");

  if (!planoId) return { erro: "Selecione um plano." };

  try {
    await criarAssinatura(tenantId, petId, planoId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao criar assinatura." };
  }

  revalidatePath(caminhoPet(tutorId, petId));
  return {};
}

export async function alterarStatusAssinaturaAction(
  tutorId: string,
  petId: string,
  assinaturaId: string,
  novoStatus: StatusAssinatura,
  _estadoAnterior: EstadoAssinatura,
  _formData: FormData,
): Promise<EstadoAssinatura> {
  const tenantId = await tenantIdDoDono();

  try {
    await atualizarStatusAssinatura(tenantId, assinaturaId, novoStatus);
  } catch (erro) {
    return {
      erro: erro instanceof Error ? erro.message : "Erro ao atualizar assinatura.",
    };
  }

  revalidatePath(caminhoPet(tutorId, petId));
  return {};
}

export async function ajustarSaldoAction(
  tutorId: string,
  petId: string,
  assinaturaId: string,
  _estadoAnterior: EstadoAssinatura,
  formData: FormData,
): Promise<EstadoAssinatura> {
  const tenantId = await tenantIdDoDono();
  const saldoDiarias = Number(formData.get("saldoDiarias"));

  if (!Number.isInteger(saldoDiarias) || saldoDiarias < 0) {
    return { erro: "Saldo precisa ser um número inteiro, 0 ou maior." };
  }

  try {
    await ajustarSaldoDiarias(tenantId, assinaturaId, saldoDiarias);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao ajustar saldo." };
  }

  revalidatePath(caminhoPet(tutorId, petId));
  return {};
}
