"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarAtendenteAction, type EstadoEquipe } from "./acoes";

const estadoInicial: EstadoEquipe = {};

export function FormularioNovoAtendente() {
  const [estado, dispatch, pendente] = useActionState(criarAtendenteAction, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) {
      formRef.current?.reset();
    }
  }, [estado]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          minLength={8}
          required
          className="h-12 text-base"
        />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
      {estado.sucesso && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Atendente criado. Entregue a senha pessoalmente.
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Criando..." : "Criar atendente"}
      </Button>
    </form>
  );
}
