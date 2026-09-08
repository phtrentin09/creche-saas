"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StatusAgendamento } from "@/lib/generated/prisma";
import type { SituacaoMensalidade } from "@/lib/cobrancas";
import { formatarHora } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { AlertaVacina } from "@/lib/vacinas";
import {
  checkInAction,
  checkOutAction,
  excluirAgendamentoAction,
  marcarFaltaAction,
  type EstadoAgendamento,
} from "./acoes";

const estadoInicial: EstadoAgendamento = {};

type AgendamentoComPet = {
  id: string;
  status: StatusAgendamento;
  checkInEm: Date | null;
  checkOutEm: Date | null;
  pet: {
    id: string;
    nome: string;
    tutor: { nome: string };
  };
};

export function LinhaAgendamento({
  agendamento,
  emAtraso,
  vacinaVencida,
  vacinaProxima,
}: {
  agendamento: AgendamentoComPet;
  emAtraso: SituacaoMensalidade;
  vacinaVencida: AlertaVacina | null;
  vacinaProxima: AlertaVacina | null;
}) {
  const { status, pet } = agendamento;
  const grave = emAtraso.emAtraso || !!vacinaVencida;
  const terminal = status === "saiu" || status === "falta";

  const [estadoCheckIn, dispatchCheckIn] = useActionState(
    checkInAction.bind(null, agendamento.id),
    estadoInicial,
  );
  const [estadoCheckOut, dispatchCheckOut] = useActionState(
    checkOutAction.bind(null, agendamento.id),
    estadoInicial,
  );
  const [estadoFalta, dispatchFalta] = useActionState(
    marcarFaltaAction.bind(null, agendamento.id),
    estadoInicial,
  );
  const [estadoRemover, dispatchRemover] = useActionState(
    excluirAgendamentoAction.bind(null, agendamento.id),
    estadoInicial,
  );
  const erro = estadoCheckIn.erro || estadoCheckOut.erro || estadoFalta.erro || estadoRemover.erro;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line-soft px-4 py-3",
        grave ? "border-l-4 border-l-destructive bg-danger-row" : terminal && "bg-surface-2",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-[17px] font-semibold",
              status === "saiu" ? "text-ink-2" : "text-foreground",
            )}
          >
            {pet.nome}
          </p>
          <ChipStatus agendamento={agendamento} />
        </div>
        <p className="mt-[3px] truncate text-[13px] text-muted-foreground">{pet.tutor.nome}</p>

        {(emAtraso.emAtraso || vacinaVencida || vacinaProxima) && (
          <div className="mt-[5px] flex flex-col gap-1">
            {emAtraso.emAtraso && (
              <span className="w-fit rounded-[4px] bg-destructive px-2 py-[3px] text-[11.5px] font-bold text-white">
                Mensalidade em atraso · {emAtraso.dias} {emAtraso.dias === 1 ? "dia" : "dias"}
              </span>
            )}
            {vacinaVencida && (
              <span className="w-fit rounded-[4px] bg-destructive px-2 py-[3px] text-[11.5px] font-bold text-white">
                Vacina vencida · {vacinaVencida.tipo}
              </span>
            )}
            {vacinaProxima && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-warning-ink">
                <span className="size-2 shrink-0 rounded-[2px] bg-warning" />
                Vacina vence em {vacinaProxima.dias} {vacinaProxima.dias === 1 ? "dia" : "dias"} ·{" "}
                {vacinaProxima.tipo}
              </span>
            )}
          </div>
        )}
        {erro && <p className="mt-1 text-[12.5px] text-destructive">{erro}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {status === "agendado" && (
          <>
            <form action={dispatchCheckIn}>
              <Button type="submit" size="list" className="rounded-lg">
                Chegou
              </Button>
            </form>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Mais ações para ${pet.nome}`}
                    className="flex size-11 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
                  >
                    ⋯
                  </button>
                }
              />
              <DropdownMenuContent align="end">
                <form action={dispatchFalta}>
                  <DropdownMenuItem
                    nativeButton
                    render={<button type="submit" className="w-full text-left" />}
                  >
                    Marcar falta
                  </DropdownMenuItem>
                </form>
                <DropdownMenuSeparator />
                <form
                  action={dispatchRemover}
                  onSubmit={(evento) => {
                    if (!confirm(`Remover ${pet.nome} da agenda?`)) {
                      evento.preventDefault();
                    }
                  }}
                >
                  <DropdownMenuItem
                    variant="destructive"
                    nativeButton
                    render={<button type="submit" className="w-full text-left" />}
                  >
                    Remover
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {status === "presente" && (
          <form action={dispatchCheckOut}>
            <button
              type="submit"
              className="flex h-12 w-24 items-center justify-center rounded-lg border-[1.5px] border-primary text-base font-semibold text-primary active:bg-brand-50"
            >
              Saiu
            </button>
          </form>
        )}

        {status === "saiu" && agendamento.checkInEm && agendamento.checkOutEm && (
          <p className="font-heading text-[15px] font-semibold text-ink-2">
            {formatarHora(agendamento.checkInEm)} → {formatarHora(agendamento.checkOutEm)}
          </p>
        )}
      </div>
    </div>
  );
}

function ChipStatus({ agendamento }: { agendamento: AgendamentoComPet }) {
  switch (agendamento.status) {
    case "agendado":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Agendado
        </Badge>
      );
    case "presente":
      return (
        <Badge variant="teal">
          Presente{agendamento.checkInEm ? ` · ${formatarHora(agendamento.checkInEm)}` : ""}
        </Badge>
      );
    case "saiu":
      return <Badge variant="dark">Saiu</Badge>;
    case "falta":
      return <Badge variant="neutral">Faltou</Badge>;
  }
}
