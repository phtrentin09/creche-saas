import { randomBytes } from "node:crypto";
import {
  criarWebhook,
  deletarWebhook,
  listarWebhooksPorEndpoint,
  webhookSecretValido,
} from "@/lib/abacatepay";
import { criptografar, descriptografar } from "@/lib/criptografia";
import { prisma } from "@/lib/prisma";

function urlAppPublica(): string | null {
  const url = process.env.URL_APP?.trim();
  if (!url) {
    return null;
  }
  try {
    const analisada = new URL(url);
    // AbacatePay recusa endpoint local/privado — nem tenta se não for
    // uma URL pública HTTPS de verdade.
    if (analisada.protocol !== "https:") {
      return null;
    }
    if (analisada.hostname === "localhost" || analisada.hostname === "127.0.0.1") {
      return null;
    }
    return url.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function gerarWebhookSecret(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Registra (ou reaproveita, ou recria) o webhook desse tenant no
 * AbacatePay.
 *
 * Idempotente por padrão: se já existe webhookSecret salvo e a chave de
 * API não mudou, não faz nada — salvar a mesma chave de novo não cria um
 * segundo webhook. Passe `forcarRecriacao: true` quando a chave de API
 * mudou de verdade (revogada/trocada, ou migrando Dev → Produção): o
 * webhook antigo pode estar apontando pra uma conta/ambiente que não é
 * mais o que gera as cobranças, e o pagamento nunca dá baixa —
 * silenciosamente, sem erro nenhum. Nesse caso lista por endpoint,
 * remove o(s) existente(s) e cria um novo com secret novo (a API não
 * devolve o secret de um webhook já existente, então não dá pra
 * reaproveitar, só recriar).
 *
 * Best-effort: sem URL_APP pública (dev local), não bloqueia o
 * salvamento da chave — só avisa.
 */
export async function garantirWebhookConfigurado(
  tenantId: string,
  chaveApi: string,
  opcoes: { forcarRecriacao?: boolean } = {},
): Promise<{ aviso?: string }> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { webhookSecret: true },
  });

  if (tenant.webhookSecret && !opcoes.forcarRecriacao) {
    return {};
  }

  const urlBase = urlAppPublica();
  if (!urlBase) {
    return {
      aviso:
        "Webhook não configurado automaticamente: defina URL_APP (endereço público HTTPS do app) pra isso funcionar. Cobranças ainda são criadas normalmente, mas pagamentos não confirmam sozinhos até o webhook existir.",
    };
  }

  const endpoint = `${urlBase}/api/webhooks/abacatepay`;

  const existentes = await listarWebhooksPorEndpoint(chaveApi, endpoint);
  for (const webhook of existentes) {
    await deletarWebhook(chaveApi, webhook.id);
  }

  const secret = gerarWebhookSecret();
  await criarWebhook(chaveApi, {
    name: "creche-saas",
    endpoint: `${endpoint}?webhookSecret=${secret}`,
    secret,
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { webhookSecret: criptografar(secret) },
  });

  return {};
}

export async function salvarChaveAbacatePay(
  tenantId: string,
  chavePlana: string,
): Promise<{ aviso?: string }> {
  const tenantAntes = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { chaveApiAbacate: true },
  });
  const chaveAnterior = tenantAntes.chaveApiAbacate
    ? descriptografar(tenantAntes.chaveApiAbacate)
    : null;
  const chaveMudou = chaveAnterior !== chavePlana;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { chaveApiAbacate: criptografar(chavePlana) },
  });

  return garantirWebhookConfigurado(tenantId, chavePlana, { forcarRecriacao: chaveMudou });
}

/** Só pra uso interno do servidor (chamar a API do AbacatePay) — nunca serializar isso de volta pro client. */
export async function chaveAbacatePayDoTenant(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { chaveApiAbacate: true },
  });
  return tenant.chaveApiAbacate ? descriptografar(tenant.chaveApiAbacate) : null;
}

/**
 * Acha qual tenant é dono desse webhookSecret — usado pela rota do
 * webhook pra saber de qual creche é o evento recebido, antes de olhar
 * o payload. Comparação timing-safe (webhookSecretValido) de propósito.
 *
 * O(n) tenants com webhook configurado: decifra e compara um por um, já
 * que o valor cifrado no banco não é determinístico (IV aleatório por
 * criptografar()), então não dá pra fazer WHERE direto no valor cifrado.
 * Aceitável pro volume de um micro-SaaS; se um dia isso escalar pra
 * milhares de tenants, trocar por um hash determinístico indexado
 * (SHA-256 do secret) resolveria sem abrir mão de comparação segura.
 */
export async function tenantPorWebhookSecret(secretRecebido: string): Promise<string | null> {
  const tenants = await prisma.tenant.findMany({
    where: { webhookSecret: { not: null } },
    select: { id: true, webhookSecret: true },
  });

  for (const tenant of tenants) {
    if (tenant.webhookSecret && webhookSecretValido(descriptografar(tenant.webhookSecret), secretRecebido)) {
      return tenant.id;
    }
  }

  return null;
}

/** "••••••••1234" ou "Não configurada". Só isso pode ir pro client, nunca a chave em si. */
export function mascararChave(chavePlana: string | null): string {
  if (!chavePlana || chavePlana.length < 4) {
    return "Não configurada";
  }
  return `••••••••${chavePlana.slice(-4)}`;
}
