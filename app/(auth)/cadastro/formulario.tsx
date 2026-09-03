"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cadastrar, type EstadoCadastro } from "./acoes";

const estadoInicial: EstadoCadastro = {};

export function FormularioCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nomeCreche">Nome da creche</Label>
        <Input id="nomeCreche" name="nomeCreche" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacidadeDiaria">Capacidade diária (nº de cães)</Label>
        <Input
          id="capacidadeDiaria"
          name="capacidadeDiaria"
          type="number"
          min={1}
          step={1}
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nomeDono">Seu nome</Label>
        <Input id="nomeDono" name="nomeDono" required className="h-12 text-base" />
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

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Criando..." : "Criar creche"}
      </Button>
    </form>
  );
}
