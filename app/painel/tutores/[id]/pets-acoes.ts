"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tenantIdDaSessao } from "@/lib/sessao";
import {
  atualizarPet,
  criarPet,
  excluirPet,
  type DadosPet,
} from "@/lib/pets";

export type EstadoPet = { erro?: string };

function lerDadosPet(formData: FormData): DadosPet {
  const nome = String(formData.get("nome") ?? "").trim();
  const raca = String(formData.get("raca") ?? "").trim();
  const porte = String(formData.get("porte") ?? "").trim();
  const observacoes = String(formData.get("observacoes") ?? "").trim();
  const castrado = formData.get("castrado") !== null;
  return {
    nome,
    raca: raca || null,
    porte: porte || null,
    castrado,
    observacoes: observacoes || null,
    fotoUrl: null,
  };
}

export async function criarPetAction(
  tutorId: string,
  _estadoAnterior: EstadoPet,
  formData: FormData,
): Promise<EstadoPet> {
  const tenantId = await tenantIdDaSessao();
  const dados = lerDadosPet(formData);

  if (!dados.nome) return { erro: "Informe o nome do pet." };

  try {
    await criarPet(tenantId, tutorId, dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao criar pet." };
  }

  revalidatePath(`/painel/tutores/${tutorId}`);
  redirect(`/painel/tutores/${tutorId}`);
}

export async function atualizarPetAction(
  tutorId: string,
  petId: string,
  _estadoAnterior: EstadoPet,
  formData: FormData,
): Promise<EstadoPet> {
  const tenantId = await tenantIdDaSessao();
  const dados = lerDadosPet(formData);

  if (!dados.nome) return { erro: "Informe o nome do pet." };

  try {
    await atualizarPet(tenantId, petId, dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao salvar pet." };
  }

  revalidatePath(`/painel/tutores/${tutorId}`);
  redirect(`/painel/tutores/${tutorId}`);
}

export async function excluirPetAction(
  tutorId: string,
  petId: string,
  _estadoAnterior: EstadoPet,
  _formData: FormData,
): Promise<EstadoPet> {
  const tenantId = await tenantIdDaSessao();

  try {
    await excluirPet(tenantId, petId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao excluir pet." };
  }

  revalidatePath(`/painel/tutores/${tutorId}`);
  redirect(`/painel/tutores/${tutorId}`);
}
