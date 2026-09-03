"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TipoPlano } from "@/lib/generated/prisma";
import type { EstadoPlano } from "./acoes";

const estadoInicial: EstadoPlano = {};

export function FormularioPlano({
  acao,
  valoresIniciais,
}: {
  acao: (estadoAnterior: EstadoPlano, formData: FormData) => Promise<EstadoPlano>;
  valoresIniciais?: {
    nome: string;
    tipo: TipoPlano;
    valorCentavos: number;
    qtdDiarias: number | null;
    diaVencimento: number | null;
  };
}) {
  const [estado, dispatch, pendente] = useActionState(acao, estadoInicial);
  const [tipo, setTipo] = useState<TipoPlano>(valoresIniciais?.tipo ?? "mensal");

  return (
    <form action={dispatch} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={valoresIniciais?.nome}
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["mensal", "pacote"] as const).map((opcao) => (
            <label
              key={opcao}
              className={`flex h-12 cursor-pointer items-center justify-center rounded-lg border text-base capitalize ${
                tipo === opcao
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-input"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={opcao}
                checked={tipo === opcao}
                onChange={() => setTipo(opcao)}
                className="sr-only"
              />
              {opcao}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="valorReais">Valor (R$)</Label>
        <Input
          id="valorReais"
          name="valorReais"
          type="number"
          step="0.01"
          min="0"
          defaultValue={
            valoresIniciais ? (valoresIniciais.valorCentavos / 100).toFixed(2) : undefined
          }
          required
          className="h-12 text-base"
        />
      </div>

      {tipo === "mensal" ? (
        <div className="space-y-2">
          <Label htmlFor="diaVencimento">Dia de vencimento (1-31)</Label>
          <Input
            id="diaVencimento"
            name="diaVencimento"
            type="number"
            min={1}
            max={31}
            defaultValue={valoresIniciais?.diaVencimento ?? undefined}
            required
            className="h-12 text-base"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="qtdDiarias">Quantidade de diárias</Label>
          <Input
            id="qtdDiarias"
            name="qtdDiarias"
            type="number"
            min={1}
            defaultValue={valoresIniciais?.qtdDiarias ?? undefined}
            required
            className="h-12 text-base"
          />
        </div>
      )}

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar plano"}
      </Button>
    </form>
  );
}
