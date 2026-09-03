"use server";

import { signIn } from "@/lib/auth";
import { cadastrarCreche, EmailJaCadastradoError } from "@/lib/onboarding";

export type EstadoCadastro = { erro?: string };

export async function cadastrar(
  _estadoAnterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const nomeCreche = String(formData.get("nomeCreche") ?? "").trim();
  const capacidadeDiaria = Number(formData.get("capacidadeDiaria"));
  const nomeDono = String(formData.get("nomeDono") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!nomeCreche) {
    return { erro: "Informe o nome da creche." };
  }
  if (!Number.isInteger(capacidadeDiaria) || capacidadeDiaria <= 0) {
    return {
      erro: "Capacidade diária precisa ser um número inteiro maior que zero.",
    };
  }
  if (!nomeDono) {
    return { erro: "Informe seu nome." };
  }
  if (!email.includes("@")) {
    return { erro: "Informe um e-mail válido." };
  }
  if (senha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  try {
    await cadastrarCreche({ nomeCreche, capacidadeDiaria, nomeDono, email, senha });
  } catch (erro) {
    if (erro instanceof EmailJaCadastradoError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  await signIn("credentials", { email, senha, redirectTo: "/painel" });
  return {};
}
