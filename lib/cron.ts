import { gerarCobrancasDoMes, marcarCobrancasVencidas } from "@/lib/cobrancas";
import { prisma } from "@/lib/prisma";

export type ResultadoRotinaDiaria = {
  tenantsComChave: number;
  tenantsSemChave: number;
  cobrancasCriadas: number;
  cobrancasJaExistentes: number;
  falhas: { tenantId: string; erro: string }[];
};

/**
 * Rotina diária de cobrança: marca vencidas e gera as do mês, pra TODOS
 * os tenants. `prisma.tenant.findMany()` sem filtro é intencional aqui —
 * isso É a exceção documentada da regra de ouro (rodar em cada tenant é
 * o próprio propósito da função), igual a tenantPorWebhookSecret em
 * lib/configuracoes.ts. Chamado só pela rota de cron, protegida por
 * CRON_SECRET — nunca exposto a partir de uma Server Action de usuário.
 *
 * Tenant sem chave AbacatePay configurada não é falha — é um tenant que
 * ainda não ativou cobrança, pulado sem contar como erro.
 */
export async function executarRotinaDiariaCobrancas(): Promise<ResultadoRotinaDiaria> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, chaveApiAbacate: true },
  });

  const resultado: ResultadoRotinaDiaria = {
    tenantsComChave: 0,
    tenantsSemChave: 0,
    cobrancasCriadas: 0,
    cobrancasJaExistentes: 0,
    falhas: [],
  };

  for (const tenant of tenants) {
    await marcarCobrancasVencidas(tenant.id);

    if (!tenant.chaveApiAbacate) {
      resultado.tenantsSemChave += 1;
      continue;
    }

    resultado.tenantsComChave += 1;
    try {
      const geracao = await gerarCobrancasDoMes(tenant.id);
      resultado.cobrancasCriadas += geracao.criadas;
      resultado.cobrancasJaExistentes += geracao.jaExistentes;
      for (const falha of geracao.falhas) {
        resultado.falhas.push({ tenantId: tenant.id, erro: falha.erro });
      }
    } catch (erro) {
      resultado.falhas.push({
        tenantId: tenant.id,
        erro: erro instanceof Error ? erro.message : "Erro desconhecido.",
      });
    }
  }

  return resultado;
}
