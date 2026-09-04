"use client";

import { useActionState, useState } from "react";
import { BotaoAcao } from "@/components/botao-acao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const rotuloSituacao: Record<SituacaoVacina, string> = {
  vencida: "Vencida",
  proxima: "Vence em breve",
  em_dia: "Em dia",
};

type Vacina = {
  id: string;
  tipo: string;
  aplicadaEm: Date;
  venceEm: Date;
  situacao: SituacaoVacina;
};

export function SecaoVacinas({
  tutorId,
  petId,
  vacinas,
}: {
  tutorId: string;
  petId: string;
  vacinas: Vacina[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-medium">Carteira de vacinas</h2>

      {vacinas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma vacina cadastrada.</p>
      ) : (
        <ul className="space-y-3">
          {vacinas.map((vacina) => (
            <li key={vacina.id}>
              <LinhaVacina tutorId={tutorId} petId={petId} vacina={vacina} />
            </li>
          ))}
        </ul>
      )}

      <FormularioNovaVacina tutorId={tutorId} petId={petId} />
    </section>
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
  const acaoExcluir = excluirVacinaAction.bind(null, tutorId, petId, vacina.id);

  if (editando) {
    return (
      <Card>
        <CardContent className="py-4">
          <FormularioEditarVacina
            tutorId={tutorId}
            petId={petId}
            vacina={vacina}
            aoSalvar={() => setEditando(false)}
            aoCancelar={() => setEditando(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{vacina.tipo}</p>
          {vacina.situacao !== "em_dia" && (
            <Badge variant={vacina.situacao === "vencida" ? "destructive" : "warning"}>
              {rotuloSituacao[vacina.situacao]}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Aplicada: {formatarDataDia(vacina.aplicadaEm)} · Vence: {formatarDataDia(vacina.venceEm)}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            Editar
          </Button>
          <BotaoAcao acao={acaoExcluir} variant="destructive" mensagemConfirmacao="Excluir esta vacina?">
            Excluir
          </BotaoAcao>
        </div>
      </CardContent>
    </Card>
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

function FormularioNovaVacina({ tutorId, petId }: { tutorId: string; petId: string }) {
  const acaoComIds = criarVacinaAction.bind(null, tutorId, petId);
  const [estado, dispatch, pendente] = useActionState(acaoComIds, estadoInicial);

  return (
    <form action={dispatch} className="space-y-3 rounded-lg border p-4">
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

      <Button type="submit" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Cadastrando..." : "Cadastrar vacina"}
      </Button>
    </form>
  );
}
