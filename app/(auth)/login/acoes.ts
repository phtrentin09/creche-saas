"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { dentroDoLimite } from "@/lib/limitador-taxa";

export type EstadoLogin = { erro?: string };

export async function entrar(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  // 10 tentativas / 5min por IP — chuta força bruta sem travar alguém
  // que só errou a senha algumas vezes.
  if (!(await dentroDoLimite("login", 10, 5 * 60 * 1000))) {
    return { erro: "Muitas tentativas de login. Aguarde alguns minutos e tente de novo." };
  }

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
