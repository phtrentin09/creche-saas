"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { atualizarPetAction, type EstadoPet } from "../../pets-acoes";

const estadoInicial: EstadoPet = {};

type ValoresPet = {
  nome: string;
  raca: string | null;
  porte: string | null;
  castrado: boolean;
  observacoes: string | null;
};

// Sem card equivalente no handoff de design (que trata nome/raça/porte
// como texto fixo no header e "Observações" dentro do card Tutor) — mas
// editar esses campos precisa continuar existindo em algum lugar, então
// fica atrás de "Editar" como as outras seções.
export function FormularioEditarPet({
  tutorId,
  petId,
  valoresIniciais,
}: {
  tutorId: string;
  petId: string;
  valoresIniciais: ValoresPet;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Dados do pet
        </p>
        {!editando && (
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
      </div>

      {editando ? (
        <div className="mt-3">
          <CamposPet
            tutorId={tutorId}
            petId={petId}
            valoresIniciais={valoresIniciais}
            aoSalvar={() => setEditando(false)}
            aoCancelar={() => setEditando(false)}
          />
        </div>
      ) : (
        <dl className="mt-2 space-y-1 text-[13px] text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Raça</dt>
            <dd className="text-foreground">{valoresIniciais.raca || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Porte</dt>
            <dd className="text-foreground">{valoresIniciais.porte || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Castrado</dt>
            <dd className="text-foreground">{valoresIniciais.castrado ? "Sim" : "Não"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function CamposPet({
  tutorId,
  petId,
  valoresIniciais,
  aoSalvar,
  aoCancelar,
}: {
  tutorId: string;
  petId: string;
  valoresIniciais: ValoresPet;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const acaoComIds = atualizarPetAction.bind(null, tutorId, petId);
  const [estado, acao, pendente] = useActionState(
    async (estadoAnterior: EstadoPet, formData: FormData) => {
      const resultado = await acaoComIds(estadoAnterior, formData);
      if (!resultado.erro) aoSalvar();
      return resultado;
    },
    estadoInicial,
  );

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

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-12" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="h-12 text-base" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
