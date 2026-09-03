"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { criarPetAction, type EstadoPet } from "../../pets-acoes";

const estadoInicial: EstadoPet = {};

export function FormularioNovoPet({ tutorId }: { tutorId: string }) {
  const acaoComTutor = criarPetAction.bind(null, tutorId);
  const [estado, acao, pendente] = useActionState(acaoComTutor, estadoInicial);

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="raca">Raça (opcional)</Label>
        <Input id="raca" name="raca" className="h-12 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="porte">Porte (opcional)</Label>
        <Input id="porte" name="porte" placeholder="pequeno, médio, grande" className="h-12 text-base" />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="castrado" name="castrado" />
        <Label htmlFor="castrado">Castrado</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações (opcional)</Label>
        <Textarea id="observacoes" name="observacoes" className="text-base" />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar pet"}
      </Button>
    </form>
  );
}
