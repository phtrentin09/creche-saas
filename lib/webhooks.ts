import { confirmarPagamento } from "@/lib/cobrancas";
import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

// Só checkout.completed sinaliza pagamento confirmado no nosso fluxo —
// usamos /checkouts/create, não /transparents/* nem /subscriptions/*.
// Não achei na doc nenhum evento genérico tipo "billing.paid": cada
// família de cobrança tem o próprio evento de conclusão. Se um dia
// migrarmos pra outro fluxo, o evento equivalente seria
// transparent.completed ou subscription.renewed — não este.
const EVENTOS_DE_PAGAMENTO_CONFIRMADO = new Set(["checkout.completed"]);

export type ResultadoProcessamento =
  | { status: "ignorado"; motivo: string }
  | { status: "duplicado" }
  | { status: "processado"; cobrancaId: string };

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/**
 * Processa um evento de webhook já validado (secret + HMAC conferidos
 * antes, pela rota — esta função não valida nada, só processa). Payload
 * tratado como `unknown` de propósito: é entrada externa, não confiamos
 * na forma exata sem checar.
 *
 * Idempotência de verdade: o INSERT em EventoWebhook usa a constraint
 * única em provedorEventoId DENTRO da mesma transação que credita o
 * saldo. Se dois requests concorrentes chegarem com o mesmo evento, só
 * um consegue inserir — o outro cai no catch do P2002 e aborta sem
 * duplicar nada. Checar "já existe?" antes, fora da transação, teria uma
 * corrida (os dois passariam pela checagem antes de um gravar).
 */
export async function processarEventoWebhook(payload: unknown): Promise<ResultadoProcessamento> {
  if (!ehObjeto(payload)) {
    throw new Error("Payload do webhook não é um objeto JSON.");
  }

  const eventoId = payload.id;
  const evento = payload.event;
  if (typeof eventoId !== "string" || typeof evento !== "string") {
    throw new Error("Payload do webhook sem id ou event.");
  }

  const payloadJson = payload as Prisma.InputJsonValue;

  if (!EVENTOS_DE_PAGAMENTO_CONFIRMADO.has(evento)) {
    // Registra mesmo assim (não reprocessa se a AbacatePay reenviar, e
    // fica no histórico), mas não credita nada.
    try {
      await prisma.eventoWebhook.create({
        data: { provedorEventoId: eventoId, payload: payloadJson },
      });
    } catch {
      // já registrado — tudo bem, não é esse tipo de evento mesmo.
    }
    return { status: "ignorado", motivo: `evento "${evento}" não é pagamento confirmado` };
  }

  const dados = ehObjeto(payload.data) ? payload.data : null;
  const externalId = dados && typeof dados.externalId === "string" ? dados.externalId : null;
  if (!externalId) {
    throw new Error("Payload do webhook sem data.externalId — não dá pra saber qual cobrança é.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.eventoWebhook.create({
        data: { provedorEventoId: eventoId, payload: payloadJson },
      });

      const cobranca = await tx.cobranca.findUnique({ where: { id: externalId } });
      if (!cobranca) {
        throw new Error(`Cobranca ${externalId} não encontrada.`);
      }

      // Mesma função usada por /pagar/[token] (urlPagamentoValida) quando
      // detecta "já pago" consultando a API ao vivo — garante que marcar
      // paga e creditar diárias sempre acontecem juntos, não importa qual
      // caminho descobriu o pagamento primeiro.
      await confirmarPagamento(tx, cobranca.id);

      return { status: "processado" as const, cobrancaId: cobranca.id };
    });
  } catch (erro) {
    if (erro instanceof Error && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return { status: "duplicado" };
    }
    throw erro;
  }
}
