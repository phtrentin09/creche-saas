// Sem imports com alias "@/" de propósito — ver lib/criptografia.ts.
// A chave de API é sempre parâmetro de função aqui dentro, nunca lida de
// variável de ambiente: cada creche tem a própria conta no AbacatePay.
import { timingSafeEqual } from "node:crypto";
import { Webhook, WebhookVerificationError } from "standardwebhooks";

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

type WebhookRegistrado = {
  id: string;
  name: string;
  endpoint: string;
  events: string[];
};

/**
 * `endpointBase` sem query string (ex: "https://app.com/api/webhooks/
 * abacatepay") — o endpoint REGISTRADO de verdade sempre tem
 * "?webhookSecret=..." embutido (é o que criarWebhook manda), então
 * comparar por igualdade exata nunca bateria com nada. Filtra por
 * prefixo de propósito.
 */
export async function listarWebhooksPorEndpoint(
  chaveApi: string,
  endpointBase: string,
): Promise<WebhookRegistrado[]> {
  const resultado = await chamarApi<WebhookRegistrado[]>(
    chaveApi,
    "GET",
    `/webhooks/list?search=${encodeURIComponent(endpointBase)}`,
  );
  // "search" da AbacatePay é livre-texto, pode trazer parecidos — filtra
  // no cliente pelo prefixo real (host + path, ignorando a query string
  // que muda a cada criação).
  return resultado.filter((webhook) => webhook.endpoint.startsWith(endpointBase));
}

export async function criarWebhook(
  chaveApi: string,
  dados: { name: string; endpoint: string; secret: string },
): Promise<WebhookRegistrado> {
  return chamarApi<WebhookRegistrado>(chaveApi, "POST", "/webhooks/create", {
    name: dados.name,
    endpoint: dados.endpoint,
    secret: dados.secret,
    events: ["checkout.completed"],
  });
}

export async function deletarWebhook(chaveApi: string, webhookId: string): Promise<void> {
  await chamarApi<WebhookRegistrado>(chaveApi, "POST", `/webhooks/delete?id=${encodeURIComponent(webhookId)}`);
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

/**
 * A doc da AbacatePay descreve um header "X-Webhook-Signature" simples
 * assinado com uma "chave pública" fixa e documentada — mas o primeiro
 * webhook real veio no formato Standard Webhooks (svix), com headers
 * webhook-id/webhook-timestamp/webhook-signature, e essa chave fixa NÃO
 * bate ("No matching signature found"). Faz sentido: Standard Webhooks
 * não tem noção de "chave pública global" — cada endpoint tem o próprio
 * secret, e é exatamente esse secret que a gente já manda no campo
 * `secret` de criarWebhook. É esse mesmo valor (webhookSecret do tenant,
 * o mesmo que vai na query string do endpoint) que assina de verdade —
 * a doc da AbacatePay está desatualizada e não documenta esse formato.
 *
 * Consequência pro modelo de segurança: como o secret que assina é o
 * MESMO que identifica o tenant na query string, a assinatura sozinha
 * não prova nada que a comparação timing-safe do webhookSecret (ver
 * webhookSecretValido) já não provasse — quem forja a query string forja
 * a assinatura também. O valor real dela aqui é garantir integridade
 * contra corrupção em trânsito e bater com o formato que a AbacatePay
 * realmente envia, não uma segunda camada de autenticação independente.
 *
 * Usa a lib oficial (`standardwebhooks`) em vez de reimplementar: ela já
 * decodifica a chave em base64 corretamente (uma implementação manual
 * ingênua usaria os bytes da string crua como chave — errado, é assim
 * que a primeira tentativa falhou), valida timestamp contra replay
 * (tolerância de 5min embutida), aceita múltiplas assinaturas espaço-
 * separadas (rotação de chave) e compara timing-safe.
 */
export type ResultadoVerificacaoWebhook =
  | { ok: true; payload: unknown }
  | { ok: false; motivo: string };

export function verificarWebhook(
  corpoBruto: string,
  headers: { webhookId: string | null; timestamp: string | null; assinatura: string | null },
  secretoTenant: string,
): ResultadoVerificacaoWebhook {
  const webhook = new Webhook(secretoTenant);
  try {
    const payload = webhook.verify(corpoBruto, {
      "webhook-id": headers.webhookId ?? "",
      "webhook-timestamp": headers.timestamp ?? "",
      "webhook-signature": headers.assinatura ?? "",
    });
    return { ok: true, payload };
  } catch (erro) {
    if (erro instanceof WebhookVerificationError) {
      return { ok: false, motivo: erro.message };
    }
    // JSON malformado depois de assinatura válida (a lib só faz
    // JSON.parse depois de confirmar a assinatura), ou outro erro
    // inesperado — não é "assinatura inválida", deixa subir.
    throw erro;
  }
}

/**
 * Diagnóstico temporário (não é código de produção definitivo — remover
 * depois de confirmar o formato certo). Calcula a assinatura esperada
 * das DUAS formas possíveis de tratar o secret (decodificado de base64,
 * que é o que verificarWebhook usa hoje; e cru, bytes da string) usando
 * a própria lib (Webhook.sign), pra comparar contra o que a AbacatePay
 * mandou sem expor o secret em si — só comprimentos e assinaturas
 * calculadas, que não permitem recuperar o secret.
 */
export function diagnosticarAssinaturaWebhook(
  corpoBruto: string,
  webhookId: string,
  timestamp: string,
  secretoTenant: string,
): Record<string, unknown> {
  const conteudoAssinado = `${webhookId}.${timestamp}.${corpoBruto}`;
  const timestampDate = new Date(Number(timestamp) * 1000);

  const resultado: Record<string, unknown> = {
    conteudoAssinado: JSON.stringify(conteudoAssinado),
    tamanhoConteudoAssinado: conteudoAssinado.length,
    tamanhoCorpo: corpoBruto.length,
    tamanhoSecretCru: secretoTenant.length,
  };

  try {
    resultado.assinatura_secretDecodificadoBase64 = new Webhook(secretoTenant).sign(
      webhookId,
      timestampDate,
      corpoBruto,
    );
  } catch (erro) {
    resultado.erro_secretDecodificadoBase64 = erro instanceof Error ? erro.message : String(erro);
  }

  try {
    resultado.assinatura_secretCru = new Webhook(secretoTenant, { format: "raw" }).sign(
      webhookId,
      timestampDate,
      corpoBruto,
    );
  } catch (erro) {
    resultado.erro_secretCru = erro instanceof Error ? erro.message : String(erro);
  }

  return resultado;
}
