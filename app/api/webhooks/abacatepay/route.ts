import { NextResponse, type NextRequest } from "next/server";
import { assinaturaWebhookValida } from "@/lib/abacatepay";
import { tenantPorWebhookSecret } from "@/lib/configuracoes";
import { processarEventoWebhook } from "@/lib/webhooks";

/**
 * Ordem de validação pensada pro custo: webhookSecret ausente e HMAC são
 * checagens baratas (sem banco) — rejeitam lixo/corrupção rápido, antes
 * de gastar a busca no banco (que decifra N tenants) só quando vale a
 * pena. A defesa real contra forjamento é o webhookSecret (específico
 * por tenant); o HMAC usa uma chave pública documentada, então sozinho
 * não prova autenticidade — só integridade do corpo em trânsito.
 *
 * CLAUDE.md pede "responder 200 rápido, processar o resto depois", mas
 * em serverless (Vercel) processar de verdade "depois" da resposta não
 * é confiável sem waitUntil — a function pode ser encerrada antes de
 * terminar. Como o processamento aqui é uma transação simples e rápida,
 * optei por processar síncrono e só então responder: mais lento em
 * poucos ms, mas garante que 200 só sai depois que o evento realmente
 * foi persistido — nunca perde silenciosamente.
 */
export async function POST(request: NextRequest) {
  const corpoBruto = await request.text();

  const webhookSecretRecebido = request.nextUrl.searchParams.get("webhookSecret");
  if (!webhookSecretRecebido) {
    return NextResponse.json({ error: "webhookSecret ausente." }, { status: 401 });
  }

  // Headers do padrão Standard Webhooks (svix) — a doc da AbacatePay
  // ainda descreve "X-Webhook-Signature" simples, mas o primeiro webhook
  // real recebido veio com esses três (ver nota em assinaturaWebhookValida).
  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");
  const assinaturaRecebida = request.headers.get("webhook-signature");

  if (!assinaturaWebhookValida(webhookId, webhookTimestamp, corpoBruto, assinaturaRecebida)) {
    // Diagnóstico temporário: primeiro ciclo real contra a AbacatePay,
    // formato de headers e payload ainda sendo confirmado na prática.
    // Nada sensível aqui — assinatura recebida não é a chave, e id/
    // timestamp não são segredo.
    console.error(
      "Webhook AbacatePay: assinatura inválida.",
      "webhook-id:", webhookId,
      "webhook-timestamp:", webhookTimestamp,
      "webhook-signature recebida:", assinaturaRecebida,
      "Headers recebidos:", [...request.headers.keys()].join(", "),
    );
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const tenantId = await tenantPorWebhookSecret(webhookSecretRecebido);
  if (!tenantId) {
    console.error("Webhook AbacatePay: webhookSecret da query string não bateu com nenhum tenant cadastrado.");
    return NextResponse.json({ error: "webhookSecret inválido." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    // webhookId nunca é null aqui: assinaturaWebhookValida já teria
    // retornado false (e a função já teria voltado 401) se fosse.
    const resultado = await processarEventoWebhook(webhookId as string, payload);
    return NextResponse.json({ ok: true, resultado });
  } catch (erro) {
    console.error(
      "Erro ao processar webhook AbacatePay:",
      erro,
      // Diagnóstico temporário: formato exato do corpo (id/event/data)
      // nunca confirmado contra um payload real da AbacatePay.
      "Corpo recebido:", corpoBruto,
    );
    // 500 de propósito (não 200): se falhou de verdade, é melhor a
    // AbacatePay reenviar (retry deles) do que a gente perder o evento.
    return NextResponse.json({ error: "Erro ao processar." }, { status: 500 });
  }
}
