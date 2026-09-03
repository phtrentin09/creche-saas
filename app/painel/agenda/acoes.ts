"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  criarAgendamento,
  excluirAgendamento,
  marcarFalta,
  registrarCheckIn,
  registrarCheckOut,
} from "@/lib/agenda";
import { dataDeStringISO } from "@/lib/formatacao";
import { tenantIdDaSessao } from "@/lib/sessao";

export type EstadoAgendamento = { erro?: string };

function caminhoAgenda(dataISO: string) {
  return `/painel/agenda?data=${dataISO}`;
}

export async function criarAgendamentoAction(
  petId: string,
  dataISO: string,
  _estadoAnterior: EstadoAgendamento,
  _formData: FormData,
): Promise<EstadoAgendamento> {
  const tenantId = await tenantIdDaSessao();

  try {
    await criarAgendamento(tenantId, petId, dataDeStringISO(dataISO));
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao agendar." };
  }

  revalidatePath("/painel/agenda");
  redirect(caminhoAgenda(dataISO));
}

export async function checkInAction(
  agendamentoId: string,
  _estadoAnterior: EstadoAgendamento,
  _formData: FormData,
): Promise<EstadoAgendamento> {
  const tenantId = await tenantIdDaSessao();

  try {
    await registrarCheckIn(tenantId, agendamentoId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao registrar chegada." };
  }

  revalidatePath("/painel/agenda");
  return {};
}

export async function checkOutAction(
  agendamentoId: string,
  _estadoAnterior: EstadoAgendamento,
  _formData: FormData,
): Promise<EstadoAgendamento> {
  const tenantId = await tenantIdDaSessao();

  try {
    await registrarCheckOut(tenantId, agendamentoId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao registrar saída." };
  }

  revalidatePath("/painel/agenda");
  return {};
}

export async function marcarFaltaAction(
  agendamentoId: string,
  _estadoAnterior: EstadoAgendamento,
  _formData: FormData,
): Promise<EstadoAgendamento> {
  const tenantId = await tenantIdDaSessao();

  try {
    await marcarFalta(tenantId, agendamentoId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao marcar falta." };
  }

  revalidatePath("/painel/agenda");
  return {};
}

export async function excluirAgendamentoAction(
  agendamentoId: string,
  _estadoAnterior: EstadoAgendamento,
  _formData: FormData,
): Promise<EstadoAgendamento> {
  const tenantId = await tenantIdDaSessao();

  try {
    await excluirAgendamento(tenantId, agendamentoId);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Erro ao remover da agenda." };
  }

  revalidatePath("/painel/agenda");
  return {};
}
