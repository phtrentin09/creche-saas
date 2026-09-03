// Sem imports com alias "@/" de propósito — este módulo precisa rodar
// tanto dentro do Next.js quanto em scripts standalone (node --experimental-
// strip-types), que não resolvem o alias do bundler.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

function obterChaveMestra(): Buffer {
  const chave = process.env.CHAVE_CRIPTOGRAFIA;
  if (!chave) {
    throw new Error("CHAVE_CRIPTOGRAFIA não configurada.");
  }
  const buffer = Buffer.from(chave, "base64");
  if (buffer.length !== 32) {
    throw new Error(
      "CHAVE_CRIPTOGRAFIA precisa decodificar pra 32 bytes (gere com: openssl rand -base64 32).",
    );
  }
  return buffer;
}

/** iv (12) + authTag (16) + cifrado, tudo concatenado e depois em base64. */
export function criptografar(textoPlano: string): string {
  const chave = obterChaveMestra();
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chave, iv);
  const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, cifrado]).toString("base64");
}

export function descriptografar(textoCifrado: string): string {
  const chave = obterChaveMestra();
  const dados = Buffer.from(textoCifrado, "base64");
  const iv = dados.subarray(0, TAMANHO_IV);
  const tag = dados.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
  const cifrado = dados.subarray(TAMANHO_IV + TAMANHO_TAG);

  const decipher = createDecipheriv(ALGORITMO, chave, iv);
  decipher.setAuthTag(tag);
  const decifrado = Buffer.concat([decipher.update(cifrado), decipher.final()]);
  return decifrado.toString("utf8");
}
