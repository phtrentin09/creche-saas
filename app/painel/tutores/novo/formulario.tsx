"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarTutorAction, type EstadoTutor } from "../acoes";

const estadoInicial: EstadoTutor = {};

export function FormularioNovoTutor() {
  const [estado, acao, pendente] = useActionState(criarTutorAction, estadoInicial);

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input id="telefone" name="telefone" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpf">CPF (opcional)</Label>
        <Input id="cpf" name="cpf" className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail (opcional)</Label>
        <Input id="email" name="email" type="email" className="h-12 text-base" />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar tutor"}
      </Button>
    </form>
  );
}
