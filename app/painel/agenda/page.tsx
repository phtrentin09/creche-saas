import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listarAgendamentosDoDia } from "@/lib/agenda";
import { temMensalidadeEmAtraso } from "@/lib/cobrancas";
import {
  dataDeStringISO,
  formatarDataDia,
  hojeNoBrasil,
  stringISODoDia,
} from "@/lib/formatacao";
import { tenantIdDaSessao } from "@/lib/sessao";
import { buscarTenantAtual } from "@/lib/tenant";
import { situacaoVacinasDoPet } from "@/lib/vacinas";
import { LinhaAgendamento } from "./linha-agendamento";

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data: dataParam } = await searchParams;
  const tenantId = await tenantIdDaSessao();

  const data = dataParam ? dataDeStringISO(dataParam) : hojeNoBrasil();
  const dataISO = stringISODoDia(data);

  const [tenant, agendamentos] = await Promise.all([
    buscarTenantAtual(tenantId),
    listarAgendamentosDoDia(tenantId, data),
  ]);

  const ocupados = agendamentos.filter((a) => a.status !== "falta").length;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Agenda</h1>
        <span className="text-sm text-muted-foreground">
          {ocupados}/{tenant.capacidadeDiaria}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          render={<Link href={`/painel/agenda?data=${stringISODoDia(diaAnterior)}`} />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          ← Anterior
        </Button>
        <span className="text-sm font-medium">{formatarDataDia(data)}</span>
        <Button
          render={<Link href={`/painel/agenda?data=${stringISODoDia(diaSeguinte)}`} />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Próximo →
        </Button>
      </div>

      <Button
        render={<Link href={`/painel/agenda/novo?data=${dataISO}`} />}
        nativeButton={false}
        className="h-12 w-full text-base"
      >
        + Agendar
      </Button>

      {agendamentos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum agendamento para esse dia.</p>
      )}

      <ul className="space-y-3">
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
    </div>
  );
}
