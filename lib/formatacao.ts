export function formatarMoeda(valorCentavos: number): string {
  return (valorCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Envio de cobrança é manual (v1): abre o WhatsApp com a mensagem pronta, sem API oficial. */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  const numeroLimpo = telefone.replace(/\D/g, "");
  const comCodigoPais = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
  return `https://wa.me/${comCodigoPais}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Formata um instante real (dataInicio, checkInEm, pagoEm etc). Fuso fixo
 * em America/Sao_Paulo de propósito — sem isso, o resultado muda conforme
 * o fuso do processo (a máquina de dev roda em -03:00, mas a Vercel roda
 * em UTC, e sem fixar o fuso a mesma data mostraria dias diferentes).
 */
export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Formata um "dia calendário" guardado como meia-noite UTC (ver
 * dataDeStringISO) — usa UTC de propósito, não America/Sao_Paulo. Meia-
 * noite UTC do dia 3 já é 21h do dia 2 em São Paulo, então formatar esse
 * valor com fuso do Brasil mostraria o dia errado. Use isso para
 * Agendamento.data, nunca para timestamps reais (use formatarData).
 */
export function formatarDataDia(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** "Sexta, 04/09" — cabeçalho da agenda. Mesma regra de fuso de formatarDataDia (dia calendário, sempre UTC). */
export function formatarDataDiaComSemana(data: Date): string {
  const diaSemana = data
    .toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long" })
    .replace("-feira", "");
  const dataCurta = data.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  });
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${dataCurta}`;
}

/** "Qua, 02/09" — lista de presenças recentes na ficha do pet. Mesma regra de fuso de formatarDataDia. */
export function formatarDataDiaAbreviada(data: Date): string {
  const diaSemana = data
    .toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" })
    .replace(".", "");
  const dataCurta = data.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  });
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${dataCurta}`;
}

/**
 * "YYYY-MM-DD" no fuso America/Sao_Paulo — só para um INSTANTE real
 * (new Date() puro). Para converter de volta um "dia calendário" (o que
 * dataDeStringISO/hojeNoBrasil retornam), use stringISODoDia — aplicar
 * o fuso do Brasil em cima de um valor que já é meia-noite UTC desloca
 * um dia pra trás (mesmo problema do formatarDataDia vs formatarData).
 */
export function formatarDataISO(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(instante);
}

/** Meia-noite UTC do dia informado (string "YYYY-MM-DD"), representando o dia calendário. */
export function dataDeStringISO(dataISO: string): Date {
  return new Date(`${dataISO}T00:00:00Z`);
}

/** Inverso de dataDeStringISO — sempre UTC, nunca America/Sao_Paulo (ver formatarDataISO). */
export function stringISODoDia(diaCalendario: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(diaCalendario);
}

/**
 * "Hoje" no fuso do Brasil, não do servidor — Vercel roda em UTC, então
 * sem isso alguém agendando às 22h em São Paulo veria o dia errado.
 */
export function hojeNoBrasil(): Date {
  return dataDeStringISO(formatarDataISO(new Date()));
}

/**
 * Cobranca.competencia e Cobranca.vencimento têm semântica diferente
 * conforme o tipo do plano: em plano mensal são "dia calendário" (meia-
 * noite UTC, ver dataDeStringISO); em pacote são o instante exato da
 * compra avulsa. Formatar errado desloca um dia (mesmo bug de
 * formatarDataDia vs formatarData) — esta função escolhe o formatador
 * certo pra cada caso.
 */
export function formatarCompetencia(data: Date, tipoPlano: "mensal" | "pacote"): string {
  return tipoPlano === "mensal" ? formatarDataDia(data) : formatarData(data);
}
