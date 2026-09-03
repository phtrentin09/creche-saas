"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type EstadoLogin = { erro?: string };

export async function entrar(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  try {
    await signIn("credentials", { email, senha, redirectTo: "/painel" });
  } catch (erro) {
    if (erro instanceof AuthError) {
      return { erro: "E-mail ou senha inválidos." };
    }
    throw erro;
  }

  return {};
}
