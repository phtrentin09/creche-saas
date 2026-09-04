import { NextResponse, type NextRequest } from "next/server";
import { executarRotinaDiariaCobrancas } from "@/lib/cron";

/**
 * Chamada pelo Vercel Cron (ver vercel.json), uma vez por dia. Protegida
 * por CRON_SECRET: a Vercel injeta automaticamente o header
 * "Authorization: Bearer <CRON_SECRET>" quando essa env var existe —
 * sem ela configurada, a rota fica bloqueada pra qualquer chamada (nunca
 * cai aberta por omissão). GET porque é assim que a Vercel invoca cron.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");

  if (!cronSecret || autorizacao !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await executarRotinaDiariaCobrancas();
  return NextResponse.json(resultado);
}
