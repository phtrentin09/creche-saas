"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SituacaoVacina } from "@/lib/vacinas";
import { formatarDataDia, stringISODoDia } from "@/lib/formatacao";
import {
  atualizarVacinaAction,
  criarVacinaAction,
  excluirVacinaAction,
  type EstadoVacina,
} from "./vacina-acoes";

const estadoInicial: EstadoVacina = {};

type Vacina = {
  id: string;
  tipo: string;
  aplicadaEm: Date;
  venceEm: Date;
  situacao: SituacaoVacina;
  dias: number;
};

function TituloCartao({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function ChipSituacao({ vacina }: { vacina: Vacina }) {
  if (vacina.situacao === "vencida") {
    return <Badge variant="destructive">Vencida</Badge>;
  }
  if (vacina.situacao === "proxima") {
    return <Badge variant="warning">Vence em {vacina.dias} {vacina.dias === 1 ? "dia" : "dias"}</Badge>;
  }
  return (
    <Badge variant="outline" className="bg-background text-ink-2">
      Em dia
    </Badge>
  );
}

export function SecaoVacinas({
  tutorId,
  petId,
  vacinas,
}: {
  tutorId: string;
  petId: string;
  vacinas: Vacina[];
}) {
  const [adicionando, setAdicionando] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <TituloCartao>Carteira de vacina</TituloCartao>

      {vacinas.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma vacina cadastrada.</p>
      ) : (
        <ul>
          {vacinas.map((vacina, indice) => (
            <li
              key={vacina.id}
              className={indice < vacinas.length - 1 ? "border-b border-line-soft" : ""}
            >
              <LinhaVacina tutorId={tutorId} petId={petId} vacina={vacina} />
            </li>
          ))}
        </ul>
      )}

      {adicionando ? (
        <div className="mt-3 border-t border-line-soft pt-3">
          <FormularioNovaVacina
            tutorId={tutorId}
            petId={petId}
            aoSalvar={() => setAdicionando(false)}
            aoCancelar={() => setAdicionando(false)}
          />
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setAdicionando(true)}
        >
          + Nova vacina
        </Button>
      )}
    </div>
  );
}

function LinhaVacina({
  tutorId,
  petId,
  vacina,
}: {
  tutorId: string;
  petId: string;
  vacina: Vacina;
}) {
  const [editando, setEditando] = useState(false);
  const [estadoRemover, dispatchRemover] = useActionState(
    excluirVacinaAction.bind(null, tutorId, petId, vacina.id),
    estadoInicial,
  );

  if (editando) {
    return (
      <div className="py-3">
        <FormularioEditarVacina
          tutorId={tutorId}
          petId={petId}
          vacina={vacina}
          aoSalvar={() => setEditando(false)}
          aoCancelar={() => setEditando(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-[11px]">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{vacina.tipo}</p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Aplicada {formatarDataDia(vacina.aplicadaEm)} · vence {formatarDataDia(vacina.venceEm)}
        </p>
        {estadoRemover.erro && (
          <p className="mt-1 text-[12.5px] text-destructive">{estadoRemover.erro}</p>
        )}
      </div>
      <ChipSituacao vacina={vacina} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Mais ações para vacina ${vacina.tipo}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
            >
              ⋯
            </button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditando(true)}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <form
            action={dispatchRemover}
            onSubmit={(evento) => {
              if (!confirm(`Excluir a vacina ${vacina.tipo}?`)) {
                evento.preventDefault();
              }
            }}
          >
            <DropdownMenuItem
              variant="destructive"
              nativeButton
              render={<button type="submit" className="w-full text-left" />}
            >
              Excluir
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FormularioEditarVacina({
  tutorId,
  petId,
  vacina,
  aoSalvar,
  aoCancelar,
}: {
  tutorId: string;
  petId: string;
  vacina: Vacina;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const acaoComIds = atualizarVacinaAction.bind(null, tutorId, petId, vacina.id);
  const [estado, dispatch, pendente] = useActionState(async (estadoAnterior: EstadoVacina, formData: FormData) => {
    const resultado = await acaoComIds(estadoAnterior, formData);
    if (!resultado.erro) aoSalvar();
    return resultado;
  }, estadoInicial);

  return (
    <form action={dispatch} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`tipo-${vacina.id}`}>Tipo</Label>
        <Input
          id={`tipo-${vacina.id}`}
          name="tipo"
          defaultValue={vacina.tipo}
          className="h-12 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`aplicadaEm-${vacina.id}`}>Aplicada em</Label>
        <Input
          id={`aplicadaEm-${vacina.id}`}
          name="aplicadaEm"
          type="date"
          defaultValue={stringISODoDia(vacina.aplicadaEm)}
          className="h-12 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`venceEm-${vacina.id}`}>Vence em</Label>
        <Input
          id={`venceEm-${vacina.id}`}
          name="venceEm"
          type="date"
          defaultValue={stringISODoDia(vacina.venceEm)}
          className="h-12 text-base"
        />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function FormularioNovaVacina({
  tutorId,
  petId,
  aoSalvar,
  aoCancelar,
}: {
  tutorId: string;
  petId: string;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const acaoComIds = criarVacinaAction.bind(null, tutorId, petId);
  const [estado, dispatch, pendente] = useActionState(async (estadoAnterior: EstadoVacina, formData: FormData) => {
    const resultado = await acaoComIds(estadoAnterior, formData);
    if (!resultado.erro) aoSalvar();
    return resultado;
  }, estadoInicial);

  return (
    <form action={dispatch} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo da vacina</Label>
        <Input id="tipo" name="tipo" placeholder="Ex: V10, Antirrábica" className="h-12 text-base" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aplicadaEm">Aplicada em</Label>
        <Input id="aplicadaEm" name="aplicadaEm" type="date" className="h-12 text-base" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="venceEm">Vence em</Label>
        <Input id="venceEm" name="venceEm" type="date" className="h-12 text-base" />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11" disabled={pendente}>
          {pendente ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
