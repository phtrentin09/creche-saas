"use client";

import { useActionState, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  ajustarSaldoAction,
  alterarStatusAssinaturaAction,
  cobrarPacoteAction,
  criarAssinaturaAction,
  type EstadoAssinatura,
} from "./assinatura-acoes";

const estadoInicial: EstadoAssinatura = {};

const rotuloStatus: Record<StatusAssinatura, string> = {
  ativa: "Em dia",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const variantePorStatus: Record<StatusAssinatura, "success" | "neutral" | "destructive"> = {
  ativa: "success",
  pausada: "neutral",
  cancelada: "destructive",
};

type AssinaturaComPlano = {
  id: string;
  status: StatusAssinatura;
  dataInicio: Date;
  saldoDiarias: number;
  plano: Plano;
};

function TituloCartao({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

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
  const [editando, setEditando] = useState(false);
  const semAssinaturaAtiva = !assinatura || assinatura.status === "cancelada";

  if (semAssinaturaAtiva) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <TituloCartao>Plano ativo</TituloCartao>
        <p className="mt-2 text-sm text-muted-foreground">Sem assinatura ativa.</p>
        {planos.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre um plano antes de vincular uma assinatura.
          </p>
        ) : (
          <div className="mt-3">
            <FormularioNovaAssinatura tutorId={tutorId} petId={petId} planos={planos} />
          </div>
        )}
      </div>
    );
  }

  const total = assinatura.plano.qtdDiarias ?? 0;
  const usadas = Math.max(total - assinatura.saldoDiarias, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <TituloCartao>Plano ativo</TituloCartao>
        <Badge variant={variantePorStatus[assinatura.status]}>{rotuloStatus[assinatura.status]}</Badge>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-[17px] font-semibold">{assinatura.plano.nome}</p>
        <p className="font-heading text-[17px] font-bold whitespace-nowrap">
          {formatarMoeda(assinatura.plano.valorCentavos)}
        </p>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Comprado em {formatarData(assinatura.dataInicio)}
      </p>

      {assinatura.plano.tipo === "pacote" ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="flex items-baseline gap-1">
              <span className="font-heading text-[22px] font-bold text-brand-900">
                {assinatura.saldoDiarias}
              </span>
              <span className="text-[13.5px] font-semibold text-ink-2">
                de {total} diárias restantes
              </span>
            </p>
            <span className="text-xs text-muted-foreground">{usadas} usadas</span>
          </div>
          {total > 0 && (
            <div className="mt-2 flex gap-[3px]">
              {Array.from({ length: total }).map((_, indice) => (
                <span
                  key={indice}
                  className={cn(
                    "h-2.5 flex-1 rounded-[2px]",
                    indice < usadas ? "bg-chip-bg" : "bg-primary",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Vence dia {assinatura.plano.diaVencimento}
        </p>
      )}

      {editando ? (
        <div className="mt-4 space-y-3 border-t border-line-soft pt-3">
          {assinatura.plano.tipo === "pacote" && (
            <>
              <FormularioAjusteSaldo
                tutorId={tutorId}
                petId={petId}
                assinaturaId={assinatura.id}
                saldoAtual={assinatura.saldoDiarias}
              />
              {assinatura.status === "ativa" && (
                <FormularioCobrarPacote
                  tutorId={tutorId}
                  petId={petId}
                  assinaturaId={assinatura.id}
                />
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
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

          <Button variant="ghost" size="sm" className="w-full" onClick={() => setEditando(false)}>
            Fechar
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setEditando(true)}
        >
          Editar
        </Button>
      )}
    </div>
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
    <form action={dispatch} className="space-y-2">
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
          className="h-11 text-base"
        />
        <Button type="submit" variant="outline" className="h-11" disabled={pendente}>
          {pendente ? "..." : "Salvar"}
        </Button>
      </div>
      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
    </form>
  );
}

function FormularioCobrarPacote({
  tutorId,
  petId,
  assinaturaId,
}: {
  tutorId: string;
  petId: string;
  assinaturaId: string;
}) {
  const acaoComIds = cobrarPacoteAction.bind(null, tutorId, petId, assinaturaId);
  const [estado, dispatch, pendente] = useActionState(acaoComIds, estadoInicial);

  return (
    <form action={dispatch} className="space-y-2">
      <Button type="submit" variant="outline" className="h-11 w-full" disabled={pendente}>
        {pendente ? "Gerando cobrança..." : "Cobrar pacote"}
      </Button>
      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
      {estado.urlPagamento && (
        <a
          href={estado.urlPagamento}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-primary underline"
        >
          Cobrança gerada — link de pagamento
        </a>
      )}
    </form>
  );
}
