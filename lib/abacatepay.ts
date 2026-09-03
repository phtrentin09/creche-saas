// Sem imports com alias "@/" de propósito — ver lib/criptografia.ts.
// A chave de API é sempre parâmetro de função aqui dentro, nunca lida de
// variável de ambiente: cada creche tem a própria conta no AbacatePay.
import { createHmac, timingSafeEqual } from "node:crypto";

const URL_BASE = "https://api.abacatepay.com/v2";

type RespostaAbacatePay<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

async function chamarApi<T>(
  chaveApi: string,
  metodo: "GET" | "POST",
  caminho: string,
  corpo?: unknown,
): Promise<T> {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${chaveApi}`,
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  const json = (await resposta.json()) as RespostaAbacatePay<T>;

  if (!resposta.ok || !json.success || !json.data) {
    throw new Error(json.error ?? `Erro ${resposta.status} na API do AbacatePay.`);
  }

  return json.data;
}

type Produto = {
  id: string;
  price: number;
};

async function criarProduto(
  chaveApi: string,
  dados: { externalId: string; name: string; price: number; description?: string },
): Promise<Produto> {
  return chamarApi<Produto>(chaveApi, "POST", "/products/create", {
    externalId: dados.externalId,
    name: dados.name,
    price: dados.price,
    currency: "BRL",
    description: dados.description,
  });
}

export type Checkout = {
  id: string;
  externalId: string | null;
  url: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  devMode: boolean;
};

async function criarCheckout(
  chaveApi: string,
  dados: { externalId: string; produtoId: string },
): Promise<Checkout> {
  return chamarApi<Checkout>(chaveApi, "POST", "/checkouts/create", {
    externalId: dados.externalId,
    items: [{ id: dados.produtoId, quantity: 1 }],
    methods: ["PIX"],
  });
}

/** Consulta o status ao vivo de um checkout — não confia só no nosso registro local, que só atualiza via webhook. */
export async function buscarCheckout(chaveApi: string, billingId: string): Promise<Checkout> {
  return chamarApi<Checkout>(
    chaveApi,
    "GET",
    `/checkouts/get?id=${encodeURIComponent(billingId)}`,
  );
}

/**
 * Cria uma cobrança de verdade no AbacatePay: um Produto novo (preço fixo,
 * descartável — nunca reaproveitado, pra não ficar dessincronizado se o
 * valor do plano mudar) e um Checkout referenciando esse produto.
 *
 * Decisão: não apagamos o produto depois que a cobrança é paga. A doc do
 * AbacatePay (POST /products/delete) não deixa claro se é exclusão física
 * ou soft-delete, nem confirma que apagar um produto de um checkout já
 * pago é seguro — só avisa que produto vinculado a checkout/assinatura
 * *ativo* não deve ser apagado. Criar produto não tem custo nem limite
 * documentado, então o único efeito de não apagar é acúmulo no catálogo
 * (mitigado pelo nome descritivo abaixo) — trocar isso por risco de
 * inconsistência numa chamada de API a mais não vale a pena.
 */
export async function criarCobrancaNoAbacatePay(
  chaveApi: string,
  dados: { nome: string; valorCentavos: number; externalId: string },
): Promise<{ billingId: string; urlPagamento: string }> {
  const produto = await criarProduto(chaveApi, {
    externalId: dados.externalId,
    name: dados.nome,
    price: dados.valorCentavos,
  });

  const checkout = await criarCheckout(chaveApi, {
    externalId: dados.externalId,
    produtoId: produto.id,
  });

  return { billingId: checkout.id, urlPagamento: checkout.url };
}

// --- Webhooks ---

type Webhook = {
  id: string;
  name: string;
  endpoint: string;
  events: string[];
};

export async function listarWebhooksPorEndpoint(
  chaveApi: string,
  endpoint: string,
): Promise<Webhook[]> {
  const resultado = await chamarApi<Webhook[]>(
    chaveApi,
    "GET",
    `/webhooks/list?search=${encodeURIComponent(endpoint)}`,
  );
  // Confirma no cliente: o "search" da AbacatePay é livre-texto, pode
  // trazer parecidos — só interessa o que bate exatamente o endpoint.
  return resultado.filter((webhook) => webhook.endpoint === endpoint);
}

export async function criarWebhook(
  chaveApi: string,
  dados: { name: string; endpoint: string; secret: string },
): Promise<Webhook> {
  return chamarApi<Webhook>(chaveApi, "POST", "/webhooks/create", {
    name: dados.name,
    endpoint: dados.endpoint,
    secret: dados.secret,
    events: ["checkout.completed"],
  });
}

export async function deletarWebhook(chaveApi: string, webhookId: string): Promise<void> {
  await chamarApi<Webhook>(chaveApi, "POST", `/webhooks/delete?id=${encodeURIComponent(webhookId)}`);
}

// --- Validação (webhook recebido) ---

function compararTimingSafe(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // Tamanhos diferentes: timingSafeEqual lançaria. Retornar false aqui
  // vaza só o tamanho, não o conteúdo — igual a qualquer HMAC comparado
  // por biblioteca padrão.
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/** O secret é o que EU gerei e cadastrei nesse webhook — comparação timing-safe contra o que veio na query string. */
export function webhookSecretValido(esperado: string, recebido: string | null): boolean {
  if (!recebido) {
    return false;
  }
  return compararTimingSafe(esperado, recebido);
}

// Chave pública fixa e documentada pela AbacatePay pra validar a
// assinatura HMAC do header X-Webhook-Signature. É igual pra toda conta
// (não é segredo por tenant) — serve pra confirmar que o corpo não foi
// corrompido/alterado em trânsito. A defesa real contra forjamento é o
// webhookSecret (ver webhookSecretValido), que é específico por tenant.
const CHAVE_PUBLICA_ABACATEPAY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

export function assinaturaWebhookValida(corpoBruto: string, assinaturaRecebida: string | null): boolean {
  if (!assinaturaRecebida) {
    return false;
  }
  const assinaturaEsperada = createHmac("sha256", CHAVE_PUBLICA_ABACATEPAY)
    .update(Buffer.from(corpoBruto, "utf8"))
    .digest("base64");
  return compararTimingSafe(assinaturaEsperada, assinaturaRecebida);
}
