import type { StatusAssinatura } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { comTenant } from "@/lib/tenant";

export async function assinaturaAtualDoPet(tenantId: string, petId: string) {
  return prisma.assinatura.findFirst({
    where: comTenant(tenantId, { petId }),
    orderBy: { dataInicio: "desc" },
    include: { plano: true },
  });
}

export async function criarAssinatura(
  tenantId: string,
  petId: string,
  planoId: string,
) {
  const pet = await prisma.pet.findFirst({
    where: comTenant(tenantId, { id: petId }),
  });
  if (!pet) {
    throw new Error("Pet não encontrado.");
  }

  const plano = await prisma.plano.findFirst({
    where: comTenant(tenantId, { id: planoId }),
  });
  if (!plano) {
    throw new Error("Plano não encontrado.");
  }

  // saldoDiarias começa em 0 mesmo pra plano pacote: creditar diárias é
  // etapa de cobrança (confirmação de pagamento via webhook), que ainda
  // não existe. Até lá, quem lançar diária avulsa paga fora do sistema
  // ajusta o saldo manualmente (ver ajustarSaldoDiarias).
  return prisma.assinatura.create({
    data: { tenantId, petId, planoId, status: "ativa", saldoDiarias: 0 },
  });
}

// updateMany de propósito: ver comentário em lib/tutores.ts.
export async function atualizarStatusAssinatura(
  tenantId: string,
  assinaturaId: string,
  status: StatusAssinatura,
) {
  const { count } = await prisma.assinatura.updateMany({
    where: comTenant(tenantId, { id: assinaturaId }),
    data: { status },
  });
  if (count === 0) {
    throw new Error("Assinatura não encontrada.");
  }
}

/**
 * Ajuste manual do saldo de diárias — comportamento definitivo, não é
 * placeholder de teste. Creches vendem pacote presencial e recebem em
 * dinheiro/Pix fora do sistema; o dono lança a diária comprada na mão.
 * Só o dono pode chamar isso (tenantIdDoDono na Server Action).
 */
export async function ajustarSaldoDiarias(
  tenantId: string,
  assinaturaId: string,
  saldoDiarias: number,
) {
  const { count } = await prisma.assinatura.updateMany({
    where: comTenant(tenantId, { id: assinaturaId }),
    data: { saldoDiarias },
  });
  if (count === 0) {
    throw new Error("Assinatura não encontrada.");
  }
}
