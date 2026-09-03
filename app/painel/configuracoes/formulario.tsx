"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarChaveAction, type EstadoConfiguracoes } from "./acoes";

const estadoInicial: EstadoConfiguracoes = {};

export function FormularioChaveAbacatePay({ chaveMascarada }: { chaveMascarada: string }) {
  const [estado, dispatch, pendente] = useActionState(salvarChaveAction, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) {
      formRef.current?.reset();
    }
  }, [estado]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Chave atual: <span className="font-mono">{chaveMascarada}</span>
      </p>

      <form ref={formRef} action={dispatch} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="chaveApiAbacate">Nova chave de API do AbacatePay</Label>
          <Input
            id="chaveApiAbacate"
            name="chaveApiAbacate"
            type="password"
            autoComplete="off"
            placeholder="Cole a chave copiada do painel do AbacatePay"
            className="h-12 text-base"
          />
        </div>

        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
        {estado.sucesso && (
          <p className="text-sm text-green-600 dark:text-green-400">Chave salva.</p>
        )}
        {estado.aviso && <p className="text-sm text-amber-600 dark:text-amber-400">{estado.aviso}</p>}

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar chave"}
        </Button>
      </form>
    </div>
  );
}
