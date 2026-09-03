"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type EstadoLogin } from "./acoes";

const estadoInicial: EstadoLogin = {};

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" required className="h-12 text-base" />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
