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

/**
 * Base64 padrão (não url-safe): é isso que a lib `standardwebhooks` (ver
 * lib/abacatepay.ts) decodifica pra virar a chave real do HMAC — decode
 * de base64url falha nela pra secrets que caem com "-" ou "_". Por isso
 * o "+"/"/" precisam ir percent-encoded na query string (feito abaixo).
 */
function gerarWebhookSecret(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Registra o webhook desse tenant no AbacatePay.
 *
 * De propósito, NÃO decide "recriar ou não" a partir de flag local
 * nenhuma (nem "já tem webhookSecret salvo?", nem "a chave mudou?") —
 * essa abordagem já causou dois bugs diferentes (um por gatilho: chave
 * trocada, depois URL_APP trocada — sempre a mesma causa raiz: confiar
 * num estado local que pode estar desatualizado em relação à AbacatePay
 * de verdade, seja porque a chave mudou, a URL_APP mudou, ou alguém
 * mexeu direto no painel deles). Em vez disso, SEMPRE confere contra o
 * estado real: lista o que já existe pra esse endpoint exato (host +
 * URL_APP atuais) e recria do zero — se já estiver tudo certo, o custo é
 * só uma chamada de listagem a mais; se não estiver, corrige na hora.
 *
 * Best-effort: sem URL_APP pública (dev local), não bloqueia o
 * salvamento da chave — só avisa.
 */
export async function garantirWebhookConfigurado(
  tenantId: string,
  chaveApi: string,
): Promise<{ aviso?: string }> {
  const urlBase = urlAppPublica();
  if (!urlBase) {
    return {
      aviso:
        "Webhook não configurado automaticamente: defina URL_APP (endereço público HTTPS do app) pra isso funcionar. Cobranças ainda são criadas normalmente, mas pagamentos não confirmam sozinhos até o webhook existir.",
    };
  }

  const endpointBase = `${urlBase}/api/webhooks/abacatepay`;

  // Apagar os antigos é limpeza, não pode bloquear o passo que importa: o
  // webhook novo precisa existir mesmo que a limpeza falhe (ex: chave de
  // teste sem permissão pra deletar — visto na prática com chave abc_dev_).
  // Um duplicado velho é inofensivo pra confirmação de pagamento (ele só
  // aponta pra um endpoint antigo/nosso mesmo); travar aqui e nunca criar
  // o novo é que reproduziria o bug original.
  const existentes = await listarWebhooksPorEndpoint(chaveApi, endpointBase);
  let avisoLimpeza: string | undefined;
  for (const webhook of existentes) {
    try {
      await deletarWebhook(chaveApi, webhook.id);
    } catch (erro) {
      avisoLimpeza =
        "Não foi possível remover webhook(s) antigo(s) na AbacatePay (permissão da chave?); um novo foi criado normalmente, mas pode haver duplicado(s) pra limpar manualmente no painel deles.";
      console.error("Falha ao deletar webhook antigo na AbacatePay:", erro);
    }
  }

  const secret = gerarWebhookSecret();
  await criarWebhook(chaveApi, {
    name: "creche-saas",
    endpoint: `${endpointBase}?webhookSecret=${encodeURIComponent(secret)}`,
    secret,
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { webhookSecret: criptografar(secret) },
  });

  return avisoLimpeza ? { aviso: avisoLimpeza } : {};
}

export async function salvarChaveAbacatePay(
  tenantId: string,
  chavePlana: string,
): Promise<{ aviso?: string }> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { chaveApiAbacate: criptografar(chavePlana) },
  });

  return garantirWebhookConfigurado(tenantId, chavePlana);
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
