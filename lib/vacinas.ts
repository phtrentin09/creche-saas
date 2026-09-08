import { prisma } from "@/lib/prisma";
import { comTenant } from "@/lib/tenant";
import { hojeNoBrasil } from "@/lib/formatacao";

export type DadosVacina = {
  tipo: string;
  aplicadaEm: Date;
  venceEm: Date;
};

export async function listarVacinasDoPet(tenantId: string, petId: string) {
  return prisma.vacina.findMany({
    where: comTenant(tenantId, { petId }),
    orderBy: { venceEm: "asc" },
  });
}

export async function criarVacina(tenantId: string, petId: string, dados: DadosVacina) {
  const pet = await prisma.pet.findFirst({ where: comTenant(tenantId, { id: petId }) });
  if (!pet) {
    throw new Error("Pet não encontrado.");
  }

  return prisma.vacina.create({
    data: { ...dados, tenantId, petId },
  });
}

// updateMany/deleteMany de propósito: ver comentário em lib/tutores.ts.
export async function atualizarVacina(
  tenantId: string,
  vacinaId: string,
  dados: Partial<DadosVacina>,
) {
  const { count } = await prisma.vacina.updateMany({
    where: comTenant(tenantId, { id: vacinaId }),
    data: dados,
  });
  if (count === 0) {
    throw new Error("Vacina não encontrada.");
  }
}

export async function excluirVacina(tenantId: string, vacinaId: string) {
  const { count } = await prisma.vacina.deleteMany({
    where: comTenant(tenantId, { id: vacinaId }),
  });
  if (count === 0) {
    throw new Error("Vacina não encontrada.");
  }
}

const DIAS_ALERTA_VENCIMENTO = 15;

export type SituacaoVacina = "vencida" | "proxima" | "em_dia";

/**
 * Vencida (já passou, pode barrar o cachorro na porta) e próxima do
 * vencimento (só aviso, ainda dá tempo) são situações com peso diferente
 * — nunca junte as duas num status só sem distinguir, o alerta visual
 * precisa ser diferente pra cada uma (ver LinhaAgendamento). Usado tanto
 * pro badge de cada vacina na ficha do pet quanto pro agregado da agenda
 * (situacaoVacinasDoPet), pra não duplicar o limiar de 15 dias em dois
 * lugares.
 */
export function classificarVacina(venceEm: Date, hoje: Date): SituacaoVacina {
  if (venceEm < hoje) return "vencida";
  const limiteAlerta = new Date(hoje);
  limiteAlerta.setUTCDate(limiteAlerta.getUTCDate() + DIAS_ALERTA_VENCIMENTO);
  if (venceEm <= limiteAlerta) return "proxima";
  return "em_dia";
}

export type AlertaVacina = { tipo: string; dias: number };

/**
 * A direção visual pede o texto exato "Vacina vence em N dias · V10" (e o
 * equivalente pra vencida) — por isso devolve tipo+dias da vacina mais
 * urgente de cada categoria, não só um booleano. Mesma query de sempre,
 * `orderBy venceEm asc` já entrega a mais vencida (data mais antiga) e a
 * mais próxima de vencer (data futura mais próxima) na ordem certa pra
 * pegar "a primeira que achar" em cada grupo.
 */
export async function situacaoVacinasDoPet(
  tenantId: string,
  petId: string,
): Promise<{ vencida: AlertaVacina | null; proximaDoVencimento: AlertaVacina | null }> {
  const hoje = hojeNoBrasil();
  const limiteAlerta = new Date(hoje);
  limiteAlerta.setUTCDate(limiteAlerta.getUTCDate() + DIAS_ALERTA_VENCIMENTO);
  const umDiaMs = 1000 * 60 * 60 * 24;

  const vacinas = await prisma.vacina.findMany({
    where: comTenant(tenantId, { petId, venceEm: { lte: limiteAlerta } }),
    select: { tipo: true, venceEm: true },
    orderBy: { venceEm: "asc" },
  });

  let vencida: AlertaVacina | null = null;
  let proximaDoVencimento: AlertaVacina | null = null;
  for (const vacina of vacinas) {
    const situacao = classificarVacina(vacina.venceEm, hoje);
    const dias = Math.abs(Math.round((vacina.venceEm.getTime() - hoje.getTime()) / umDiaMs));
    if (situacao === "vencida" && !vencida) {
      vencida = { tipo: vacina.tipo, dias };
    }
    if (situacao === "proxima" && !proximaDoVencimento) {
      proximaDoVencimento = { tipo: vacina.tipo, dias };
    }
  }

  return { vencida, proximaDoVencimento };
}
