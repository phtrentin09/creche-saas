"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { BotaoAcao } from "@/components/botao-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plano, StatusAssinatura } from "@/lib/generated/prisma";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import {
  ajustarSaldoAction,
  alterarStatusAssinaturaAction,
  criarAssinaturaAction,
  type EstadoAssinatura,
} from "./assinatura-acoes";

const estadoInicial: EstadoAssinatura = {};

const rotuloStatus: Record<StatusAssinatura, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

type AssinaturaComPlano = {
  id: string;
  status: StatusAssinatura;
  dataInicio: Date;
  saldoDiarias: number;
  plano: Plano;
};

export function SecaoAssinatura({
  tutorId,
  petId,
  assinatura,
  planos,
}: {
  tutorId: string;
  petId: string;
  assinatura: AssinaturaComPlano | null;
  planos: Plano[];
}) {
  const semAssinaturaAtiva = !assinatura || assinatura.status === "cancelada";

  if (semAssinaturaAtiva) {
    return (
      <section className="space-y-3">
        <h2 className="font-medium">Assinatura</h2>
        <p className="text-sm text-muted-foreground">Sem assinatura ativa.</p>
        {planos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre um plano antes de vincular uma assinatura.
          </p>
        ) : (
          <FormularioNovaAssinatura tutorId={tutorId} petId={petId} planos={planos} />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Assinatura</h2>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{assinatura.plano.nome}</p>
          <Badge variant={assinatura.status === "ativa" ? "default" : "secondary"}>
            {rotuloStatus[assinatura.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatarMoeda(assinatura.plano.valorCentavos)} ·{" "}
          {assinatura.plano.tipo === "mensal"
            ? `vence dia ${assinatura.plano.diaVencimento}`
            : `${assinatura.plano.qtdDiarias} diárias no pacote`}
        </p>
        <p className="text-sm text-muted-foreground">
          Início: {formatarData(assinatura.dataInicio)}
        </p>

        {assinatura.plano.tipo === "pacote" && (
          <FormularioAjusteSaldo
            tutorId={tutorId}
            petId={petId}
            assinaturaId={assinatura.id}
            saldoAtual={assinatura.saldoDiarias}
          />
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          {assinatura.status === "ativa" ? (
            <BotaoAcao
              acao={alterarStatusAssinaturaAction.bind(
                null,
                tutorId,
                petId,
                assinatura.id,
                "pausada",
              )}
            >
              Pausar
            </BotaoAcao>
          ) : (
            <BotaoAcao
              acao={alterarStatusAssinaturaAction.bind(
                null,
                tutorId,
                petId,
                assinatura.id,
                "ativa",
              )}
            >
              Reativar
            </BotaoAcao>
          )}
          <BotaoAcao
            acao={alterarStatusAssinaturaAction.bind(
              null,
              tutorId,
              petId,
              assinatura.id,
              "cancelada",
            )}
            variant="destructive"
            mensagemConfirmacao="Cancelar esta assinatura?"
          >
            Cancelar
          </BotaoAcao>
        </div>
      </div>
    </section>
  );
}

function FormularioNovaAssinatura({
  tutorId,
  petId,
  planos,
}: {
  tutorId: string;
  petId: string;
  planos: Plano[];
}) {
  const acaoComIds = criarAssinaturaAction.bind(null, tutorId, petId);
  const [estado, dispatch, pendente] = useActionState(acaoComIds, estadoInicial);

  return (
    <form action={dispatch} className="space-y-3">
      <Select name="planoId" defaultValue={planos[0]?.id}>
        <SelectTrigger className="h-12 w-full text-base">
          <SelectValue placeholder="Selecione um plano">
            {(value: string | null) => {
              const plano = planos.find((p) => p.id === value);
              return plano ? `${plano.nome} · ${formatarMoeda(plano.valorCentavos)}` : null;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {planos.map((plano) => (
            <SelectItem key={plano.id} value={plano.id}>
              {plano.nome} · {formatarMoeda(plano.valorCentavos)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <Button type="submit" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Vinculando..." : "Vincular plano"}
      </Button>
    </form>
  );
}

function FormularioAjusteSaldo({
  tutorId,
  petId,
  assinaturaId,
  saldoAtual,
}: {
  tutorId: string;
  petId: string;
  assinaturaId: string;
  saldoAtual: number;
}) {
  const acaoComIds = ajustarSaldoAction.bind(null, tutorId, petId, assinaturaId);
  const [estado, dispatch, pendente] = useActionState(acaoComIds, estadoInicial);

  return (
    <form action={dispatch} className="space-y-2 border-t pt-3">
      <Label htmlFor="saldoDiarias">
        Saldo de diárias — ajuste manual (pago fora do sistema)
      </Label>
      <div className="flex gap-2">
        <Input
          id="saldoDiarias"
          name="saldoDiarias"
          type="number"
          min={0}
          step={1}
          defaultValue={saldoAtual}
          className="h-10 text-base"
        />
        <Button type="submit" variant="outline" disabled={pendente}>
          {pendente ? "..." : "Salvar"}
        </Button>
      </div>
      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}
