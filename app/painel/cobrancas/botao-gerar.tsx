"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { gerarCobrancasDoMesAction, type EstadoCobrancas } from "./acoes";

const estadoInicial: EstadoCobrancas = {};

export function BotaoGerarCobrancas() {
  const [estado, dispatch, pendente] = useActionState(gerarCobrancasDoMesAction, estadoInicial);

  return (
    <div className="space-y-2">
      <form action={dispatch}>
        <Button type="submit" className="h-12 w-full text-base" disabled={pendente}>
          {pendente ? "Gerando..." : "Gerar cobranças do mês"}
        </Button>
      </form>
      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
      {estado.mensagem && <p className="text-sm text-muted-foreground">{estado.mensagem}</p>}
    </div>
  );
}
