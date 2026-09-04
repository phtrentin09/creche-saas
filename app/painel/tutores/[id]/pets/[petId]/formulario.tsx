"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { atualizarPetAction, type EstadoPet } from "../../pets-acoes";

const estadoInicial: EstadoPet = {};

export function FormularioEditarPet({
  tutorId,
  petId,
  valoresIniciais,
}: {
  tutorId: string;
  petId: string;
  valoresIniciais: {
    nome: string;
    raca: string | null;
    porte: string | null;
    castrado: boolean;
    observacoes: string | null;
  };
}) {
  const acaoComIds = atualizarPetAction.bind(null, tutorId, petId);
  const [estado, acao, pendente] = useActionState(acaoComIds, estadoInicial);

  return (
    <form action={acao} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={valoresIniciais.nome}
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="raca">Raça (opcional)</Label>
        <Input
          id="raca"
          name="raca"
          defaultValue={valoresIniciais.raca ?? ""}
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="porte">Porte (opcional)</Label>
        <Input
          id="porte"
          name="porte"
          defaultValue={valoresIniciais.porte ?? ""}
          placeholder="pequeno, médio, grande"
          className="h-12 text-base"
        />
      </div>

      <Label htmlFor="castrado" className="h-11 w-fit">
        <Checkbox id="castrado" name="castrado" defaultChecked={valoresIniciais.castrado} />
        Castrado
      </Label>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações (opcional)</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={valoresIniciais.observacoes ?? ""}
          className="text-base"
        />
      </div>

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
