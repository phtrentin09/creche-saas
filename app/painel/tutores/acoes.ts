"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tenantIdDaSessao } from "@/lib/sessao";
import {
  atualizarTutor,
  criarTutor,
  excluirTutor,
  type DadosTutor,
} from "@/lib/tutores";

export type EstadoTutor = { erro?: string };

function lerDadosTutor(formData: FormData): DadosTutor {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  return { nome, telefone, cpf: cpf || null, email: email || null };
}

export async function criarTutorAction(
  _estadoAnterior: EstadoTutor,
  formData: FormData,
): Promise<EstadoTutor> {
  const tenantId = await tenantIdDaSessao();
  const dados = lerDadosTutor(formData);

  if (!dados.nome) return { erro: "Informe o nome do tutor." };
  if (!dados.telefone) return { erro: "Informe o telefone do tutor." };

  let tutor;
  try {
    tutor = await criarTutor(tenantId, dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao criar tutor." };
  }

  revalidatePath("/painel/tutores");
  redirect(`/painel/tutores/${tutor.id}`);
}

export async function atualizarTutorAction(
  tutorId: string,
  _estadoAnterior: EstadoTutor,
  formData: FormData,
): Promise<EstadoTutor> {
  const tenantId = await tenantIdDaSessao();
  const dados = lerDadosTutor(formData);

  if (!dados.nome) return { erro: "Informe o nome do tutor." };
  if (!dados.telefone) return { erro: "Informe o telefone do tutor." };

  try {
    await atualizarTutor(tenantId, tutorId, dados);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao salvar tutor." };
  }

  revalidatePath(`/painel/tutores/${tutorId}`);
  revalidatePath("/painel/tutores");
  return {};
}

export async function excluirTutorAction(
  tutorId: string,
  _estadoAnterior: EstadoTutor,
  _formData: FormData,
): Promise<EstadoTutor> {
  const tenantId = await tenantIdDaSessao();

  try {
    await excluirTutor(tenantId, tutorId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao excluir tutor." };
  }

  revalidatePath("/painel/tutores");
  redirect("/painel/tutores");
}
