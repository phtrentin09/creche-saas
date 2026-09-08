import Link from "next/link";
import { listarAgendamentosDoDia } from "@/lib/agenda";
import { temMensalidadeEmAtraso } from "@/lib/cobrancas";
import {
  dataDeStringISO,
  formatarDataDiaComSemana,
  hojeNoBrasil,
  stringISODoDia,
} from "@/lib/formatacao";
import { tenantIdDaSessao, usuarioDaSessao } from "@/lib/sessao";
import { buscarTenantAtual } from "@/lib/tenant";
import { situacaoVacinasDoPet } from "@/lib/vacinas";
import { LinhaAgendamento } from "./linha-agendamento";

const rotuloPapel = { dono: "dono", atendente: "atendente" } as const;

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data: dataParam } = await searchParams;
  const [usuario, tenantId] = await Promise.all([usuarioDaSessao(), tenantIdDaSessao()]);

  const data = dataParam ? dataDeStringISO(dataParam) : hojeNoBrasil();
  const dataISO = stringISODoDia(data);
  const ehHoje = dataISO === stringISODoDia(hojeNoBrasil());

  const [tenant, agendamentos] = await Promise.all([
    buscarTenantAtual(tenantId),
    listarAgendamentosDoDia(tenantId, data),
  ]);

  const ocupados = agendamentos.filter((a) => a.status !== "falta").length;
  const vagasLivres = Math.max(tenant.capacidadeDiaria - ocupados, 0);
  const percentualOcupado = Math.min(
    (ocupados / Math.max(tenant.capacidadeDiaria, 1)) * 100,
    100,
  );

  const diaAnterior = new Date(data);
  diaAnterior.setUTCDate(diaAnterior.getUTCDate() - 1);
  const diaSeguinte = new Date(data);
  diaSeguinte.setUTCDate(diaSeguinte.getUTCDate() + 1);

  const agendamentosComAlerta = await Promise.all(
    agendamentos.map(async (agendamento) => {
      const [emAtraso, vacina] = await Promise.all([
        temMensalidadeEmAtraso(tenantId, agendamento.petId),
        situacaoVacinasDoPet(tenantId, agendamento.petId),
      ]);
      return { agendamento, emAtraso, vacina };
    }),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand-900 px-4 pt-3.5 pb-4">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="font-heading text-[15px] font-semibold text-white">{tenant.nome}</p>
          <p className="text-xs text-on-dark-muted">
            {usuario.name} · {rotuloPapel[usuario.papel as "dono" | "atendente"]}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Link
            href={`/painel/agenda?data=${stringISODoDia(diaAnterior)}`}
            aria-label="Dia anterior"
            className="flex size-11 items-center justify-center rounded-lg bg-brand-fill-dark text-lg text-[#CFE1E1] active:bg-brand-track"
          >
            ‹
          </Link>
          <div className="text-center">
            <p className="font-heading text-xl font-bold tracking-[-0.01em] text-white">
              {formatarDataDiaComSemana(data)}
            </p>
            {ehHoje && (
              <p className="mt-0.5 text-[11.5px] font-bold tracking-[0.04em] text-on-dark-muted uppercase">
                Hoje
              </p>
            )}
          </div>
          <Link
            href={`/painel/agenda?data=${stringISODoDia(diaSeguinte)}`}
            aria-label="Próximo dia"
            className="flex size-11 items-center justify-center rounded-lg bg-brand-fill-dark text-lg text-[#CFE1E1] active:bg-brand-track"
          >
            ›
          </Link>
        </div>
      </header>

      <div className="bg-primary px-4 pt-2.5 pb-3">
        <div className="flex items-end justify-between">
          <p className="flex items-baseline gap-1">
            <span className="font-heading text-[22px] font-bold text-white">{ocupados}</span>
            <span className="font-heading text-[15px] font-medium text-on-primary-muted">
              /{tenant.capacidadeDiaria} vagas
            </span>
          </p>
          <p className="text-xs text-on-primary-muted">{vagasLivres} vagas livres</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-track">
          <div
            className="h-full rounded-full bg-brand-300"
            style={{ width: `${percentualOcupado}%` }}
          />
        </div>
      </div>

      <div className="flex-1 bg-card">
        {agendamentos.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhum agendamento para esse dia.</p>
        )}

        <ul>
          {agendamentosComAlerta.map(({ agendamento, emAtraso, vacina }) => (
            <li key={agendamento.id}>
              <LinhaAgendamento
                agendamento={agendamento}
                emAtraso={emAtraso}
                vacinaVencida={vacina.vencida}
                vacinaProxima={vacina.proximaDoVencimento}
              />
            </li>
          ))}
        </ul>

        <div className="p-4">
          <Link
            href={`/painel/agenda/novo?data=${dataISO}`}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-border text-sm font-medium active:bg-brand-50"
          >
            + Agendar
          </Link>
        </div>
      </div>
    </div>
  );
}
