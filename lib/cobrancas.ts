import { randomBytes } from "node:crypto";
import { buscarCheckout, criarCobrancaNoAbacatePay } from "@/lib/abacatepay";
import { chaveAbacatePayDoTenant } from "@/lib/configuracoes";
import type { Plano, Prisma, PrismaClient } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { buscarTenantAtual, comTenant } from "@/lib/tenant";

type ClientePrisma = PrismaClient | Prisma.TransactionClient;

/**
 * Etapa 2 deixou isso como placeholder (sempre false) — agora que
 * webhook/Cobranca funcionam de verdade, vale a pena de verdade. Não
 * confia só em status "vencida" (não existe job agendado que faz essa
 * transição sozinho ainda) — checa também pendente + vencimento passado.
 */
export async function temMensalidadeEmAtraso(tenantId: string, petId: string): Promise<boolean> {
  const cobranca = await prisma.cobranca.findFirst({
    where: {
      tenantId,
      assinatura: { petId },
      status: { in: ["pendente", "vencida"] },
      vencimento: { lt: new Date() },
    },
  });
  return !!cobranca;
}

function gerarToken(): string {
  return randomBytes(32).toString("hex");
}

function primeiroDiaDoMesUTC(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

/** URL base do app pra montar links absolutos (wa.me, /pagar/[token]). Sem URL_APP (dev local), cai no localhost. */
export function urlBaseDoApp(): string {
  return process.env.URL_APP?.trim() || "http://localhost:3000";
}

// "Mensalidade 09/2026 — Rex (Creche Amigo Fiel)": o dono também usa
// essa conta do AbacatePay, então o nome do produto precisa ficar
// legível na lista do painel deles, não só no nosso banco.
function nomeCobranca(
  tenantNome: string,
  competencia: Date,
  assinatura: { plano: Pick<Plano, "tipo" | "qtdDiarias">; pet: { nome: string } },
): string {
  const rotulo =
    assinatura.plano.tipo === "mensal"
      ? `Mensalidade ${String(competencia.getUTCMonth() + 1).padStart(2, "0")}/${competencia.getUTCFullYear()}`
      : `Pacote ${assinatura.plano.qtdDiarias} diárias`;
  return `${rotulo} — ${assinatura.pet.nome} (${tenantNome})`;
}

export async function listarCobrancas(tenantId: string) {
  return prisma.cobranca.findMany({
    where: comTenant(tenantId),
    include: {
      assinatura: { include: { pet: { include: { tutor: true } }, plano: true } },
    },
    orderBy: { competencia: "desc" },
  });
}

export type ResultadoGeracao = {
  criadas: number;
  jaExistentes: number;
  falhas: { assinaturaId: string; erro: string }[];
};

/**
 * Uma Cobranca por assinatura ativa de plano MENSAL, para a competência
 * do mês atual. Pacote não entra aqui — é cobrança avulsa (cobrarPacote).
 * Idempotente: @@unique([assinaturaId, competencia]) no schema garante
 * que rodar isso duas vezes no mesmo mês não duplica.
 */
export async function gerarCobrancasDoMes(tenantId: string): Promise<ResultadoGeracao> {
  const chaveApi = await chaveAbacatePayDoTenant(tenantId);
  if (!chaveApi) {
    throw new Error(
      "Configure a chave de API do AbacatePay em Configurações antes de gerar cobranças.",
    );
  }

  const tenant = await buscarTenantAtual(tenantId);
  const competencia = primeiroDiaDoMesUTC(new Date());

  const assinaturas = await prisma.assinatura.findMany({
    where: { tenantId, status: "ativa", plano: { tipo: "mensal" } },
    include: { pet: true, plano: true },
  });

  const resultado: ResultadoGeracao = { criadas: 0, jaExistentes: 0, falhas: [] };

  for (const assinatura of assinaturas) {
    const existente = await prisma.cobranca.findUnique({
      where: {
        assinaturaId_competencia: { assinaturaId: assinatura.id, competencia },
      },
    });

    // Já tem cobrança E já foi criada de verdade no AbacatePay — nada a fazer.
    if (existente?.abacateBillingId) {
      resultado.jaExistentes += 1;
      continue;
    }

    // Ainda não existe registro: cria. Se existe mas sem billingId (uma
    // tentativa anterior criou o registro só localmente e a chamada à API
    // falhou — chave errada, API fora do ar), reaproveita o mesmo registro
    // em vez de deixá-lo travado pra sempre sem link.
    const cobranca =
      existente ??
      (await prisma.cobranca.create({
        data: {
          tenantId,
          assinaturaId: assinatura.id,
          competencia,
          valorCentavos: assinatura.plano.valorCentavos,
          vencimento: new Date(
            Date.UTC(
              competencia.getUTCFullYear(),
              competencia.getUTCMonth(),
              assinatura.plano.diaVencimento ?? 10,
            ),
          ),
          status: "pendente",
          token: gerarToken(),
        },
      }));

    try {
      const { billingId, urlPagamento } = await criarCobrancaNoAbacatePay(chaveApi, {
        nome: nomeCobranca(tenant.nome, competencia, assinatura),
        valorCentavos: assinatura.plano.valorCentavos,
        externalId: cobranca.id,
      });

      await prisma.cobranca.update({
        where: { id: cobranca.id },
        data: { abacateBillingId: billingId, urlPagamento },
      });

      resultado.criadas += 1;
    } catch (erro) {
      resultado.falhas.push({
        assinaturaId: assinatura.id,
        erro: erro instanceof Error ? erro.message : "Erro desconhecido.",
      });
    }
  }

  return resultado;
}

/**
 * Cobrança avulsa de um pacote — diária comprada sob demanda, não é
 * recorrente. competencia = instante exato (não o mês truncado), então
 * nunca colide com a constraint de unicidade mesmo comprando dois
 * pacotes no mesmo mês.
 */
export async function cobrarPacote(tenantId: string, assinaturaId: string) {
  const chaveApi = await chaveAbacatePayDoTenant(tenantId);
  if (!chaveApi) {
    throw new Error(
      "Configure a chave de API do AbacatePay em Configurações antes de cobrar.",
    );
  }

  const assinatura = await prisma.assinatura.findFirst({
    where: comTenant(tenantId, { id: assinaturaId }),
    include: { pet: true, plano: true },
  });
  if (!assinatura) {
    throw new Error("Assinatura não encontrada.");
  }
  if (assinatura.plano.tipo !== "pacote") {
    throw new Error("Essa assinatura não é de um plano pacote.");
  }
  if (assinatura.status !== "ativa") {
    throw new Error("A assinatura precisa estar ativa pra gerar cobrança.");
  }

  const tenant = await buscarTenantAtual(tenantId);
  const agora = new Date();

  const cobranca = await prisma.cobranca.create({
    data: {
      tenantId,
      assinaturaId: assinatura.id,
      competencia: agora,
      valorCentavos: assinatura.plano.valorCentavos,
      vencimento: agora,
      status: "pendente",
      token: gerarToken(),
    },
  });

  const { billingId, urlPagamento } = await criarCobrancaNoAbacatePay(chaveApi, {
    nome: nomeCobranca(tenant.nome, agora, assinatura),
    valorCentavos: assinatura.plano.valorCentavos,
    externalId: cobranca.id,
  });

  return prisma.cobranca.update({
    where: { id: cobranca.id },
    data: { abacateBillingId: billingId, urlPagamento },
  });
}

/**
 * Marca a cobrança como paga e credita diárias (se pacote) — idempotente,
 * não faz nada se já estiver paga. Aceita um client genérico (PrismaClient
 * ou o `tx` de uma transação em andamento) porque é chamada de dois
 * lugares: dentro da transação do webhook (lib/webhooks.ts) E fora dela,
 * quando /pagar/[token] descobre "já pago" consultando a API ao vivo
 * (confirmarPagamentoStandalone). Os dois caminhos precisam do MESMO
 * efeito (marcar paga + creditar), senão o crédito de diárias depende de
 * qual dos dois chegou primeiro — bug real que só apareceu pensando com
 * cuidado no caso "tutor paga e reabre a página antes do webhook chegar".
 */
export async function confirmarPagamento(db: ClientePrisma, cobrancaId: string): Promise<void> {
  const cobranca = await db.cobranca.findUniqueOrThrow({
    where: { id: cobrancaId },
    include: { assinatura: { include: { plano: true } } },
  });

  if (cobranca.status === "paga") {
    return;
  }

  await db.cobranca.update({
    where: { id: cobranca.id },
    data: { status: "paga", pagoEm: new Date() },
  });

  if (cobranca.assinatura.plano.tipo === "pacote") {
    await db.assinatura.update({
      where: { id: cobranca.assinatura.id },
      data: { saldoDiarias: { increment: cobranca.assinatura.plano.qtdDiarias ?? 0 } },
    });
  }
}

export async function confirmarPagamentoStandalone(cobrancaId: string): Promise<void> {
  await prisma.$transaction((tx) => confirmarPagamento(tx, cobrancaId));
}

export async function buscarCobrancaPorToken(token: string) {
  return prisma.cobranca.findUnique({
    where: { token },
    include: {
      tenant: true,
      assinatura: { include: { pet: true, plano: true } },
    },
  });
}

/**
 * Garante que a cobrança tem um link de pagamento válido AGORA — não
 * confia cegamente no que está salvo (só atualiza via webhook, que pode
 * atrasar ou nunca chegar em dev). Consulta o status ao vivo na
 * AbacatePay; se PAID, confirma por esse caminho (sem esperar o
 * webhook); se EXPIRED/CANCELLED ou nunca teve billing, regenera um
 * checkout novo. É o que justifica /pagar/[token] existir em vez de só
 * mandar a urlPagamento salva direto: o link nunca morre.
 */
export async function urlPagamentoValida(cobrancaId: string): Promise<{
  urlPagamento: string;
  paga: boolean;
}> {
  const cobranca = await prisma.cobranca.findUniqueOrThrow({
    where: { id: cobrancaId },
    include: { tenant: true, assinatura: { include: { pet: true, plano: true } } },
  });

  if (cobranca.status === "paga") {
    return { urlPagamento: cobranca.urlPagamento ?? "", paga: true };
  }

  const chaveApi = await chaveAbacatePayDoTenant(cobranca.tenantId);
  if (!chaveApi) {
    throw new Error(
      "A creche ainda não configurou o recebimento. Fale direto com ela pra combinar o pagamento.",
    );
  }

  if (cobranca.abacateBillingId) {
    const checkoutAoVivo = await buscarCheckout(chaveApi, cobranca.abacateBillingId);

    if (checkoutAoVivo.status === "PAID") {
      await confirmarPagamentoStandalone(cobranca.id);
      return { urlPagamento: cobranca.urlPagamento ?? checkoutAoVivo.url, paga: true };
    }

    if (checkoutAoVivo.status === "PENDING") {
      return { urlPagamento: cobranca.urlPagamento ?? checkoutAoVivo.url, paga: false };
    }

    // EXPIRED ou CANCELLED: cai pra regeneração abaixo.
  }

  const { billingId, urlPagamento } = await criarCobrancaNoAbacatePay(chaveApi, {
    nome: nomeCobranca(cobranca.tenant.nome, cobranca.competencia, cobranca.assinatura),
    valorCentavos: cobranca.valorCentavos,
    externalId: cobranca.id,
  });

  await prisma.cobranca.update({
    where: { id: cobranca.id },
    data: { abacateBillingId: billingId, urlPagamento },
  });

  return { urlPagamento, paga: false };
}

/**
 * Marca como "vencida" as cobranças pendentes cujo vencimento já passou —
 * não tem job agendado ainda que faça essa transição sozinho. Chame isso
 * ANTES de listarCobrancas/resumoFinanceiro, nunca em paralelo com elas
 * (Promise.all): a leitura pode correr antes do commit desse update e
 * mostrar "pendente" numa cobrança que o resumo já contou como "vencida".
 */
export async function marcarCobrancasVencidas(tenantId: string): Promise<void> {
  await prisma.cobranca.updateMany({
    where: { tenantId, status: "pendente", vencimento: { lt: new Date() } },
    data: { status: "vencida" },
  });
}

/** Recebido no mês + cobranças em atraso, pro painel financeiro. Chame marcarCobrancasVencidas antes. */
export async function resumoFinanceiro(tenantId: string) {
  const agora = new Date();
  const inicioMes = primeiroDiaDoMesUTC(agora);
  const inicioProximoMes = new Date(
    Date.UTC(inicioMes.getUTCFullYear(), inicioMes.getUTCMonth() + 1, 1),
  );

  const [recebidas, emAtraso] = await Promise.all([
    prisma.cobranca.aggregate({
      where: { tenantId, status: "paga", pagoEm: { gte: inicioMes, lt: inicioProximoMes } },
      _sum: { valorCentavos: true },
    }),
    prisma.cobranca.findMany({
      where: { tenantId, status: "vencida" },
      include: { assinatura: { include: { pet: { include: { tutor: true } } } } },
      orderBy: { vencimento: "asc" },
    }),
  ]);

  return {
    recebidoNoMesCentavos: recebidas._sum.valorCentavos ?? 0,
    emAtraso,
  };
}
