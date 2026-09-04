"use server";

import { revalidatePath } from "next/cache";
import { criarAtendente, redefinirSenhaAtendente } from "@/lib/equipe";
import { tenantIdDoDono } from "@/lib/sessao";

export type EstadoEquipe = { erro?: string; sucesso?: boolean };

export async function criarAtendenteAction(
  _estadoAnterior: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const tenantId = await tenantIdDoDono();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!nome) return { erro: "Informe o nome." };
  if (!email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (senha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  try {
    await criarAtendente(tenantId, { nome, email, senha });
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao criar usuário." };
  }

  revalidatePath("/painel/equipe");
  return { sucesso: true };
}

export async function redefinirSenhaAction(
  usuarioId: string,
  _estadoAnterior: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const tenantId = await tenantIdDoDono();
  const novaSenha = String(formData.get("novaSenha") ?? "");

  if (novaSenha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  try {
    await redefinirSenhaAtendente(tenantId, usuarioId, novaSenha);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao redefinir senha." };
  }

  revalidatePath("/painel/equipe");
  return { sucesso: true };
}
