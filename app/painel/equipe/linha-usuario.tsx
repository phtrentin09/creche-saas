"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Papel } from "@/lib/generated/prisma";
import { redefinirSenhaAction, type EstadoEquipe } from "./acoes";

const estadoInicial: EstadoEquipe = {};

const rotuloPapel: Record<Papel, string> = {
  dono: "Dono",
  atendente: "Atendente",
};

type Usuario = { id: string; nome: string; email: string; papel: Papel };

export function LinhaUsuario({ usuario }: { usuario: Usuario }) {
  const [redefinindo, setRedefinindo] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{usuario.nome}</p>
            <p className="text-sm text-muted-foreground">{usuario.email}</p>
          </div>
          <Badge variant={usuario.papel === "dono" ? "default" : "secondary"}>
            {rotuloPapel[usuario.papel]}
          </Badge>
        </div>

        {usuario.papel === "atendente" &&
          (redefinindo ? (
            <FormularioRedefinirSenha usuarioId={usuario.id} onCancelar={() => setRedefinindo(false)} />
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setRedefinindo(true)}>
              Redefinir senha
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}

function FormularioRedefinirSenha({
  usuarioId,
  onCancelar,
}: {
  usuarioId: string;
  onCancelar: () => void;
}) {
  const acaoComId = redefinirSenhaAction.bind(null, usuarioId);
  const [estado, dispatch, pendente] = useActionState(acaoComId, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) {
      formRef.current?.reset();
    }
  }, [estado]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-2 border-t pt-3">
      <Label htmlFor={`novaSenha-${usuarioId}`}>Nova senha</Label>
      <Input
        id={`novaSenha-${usuarioId}`}
        name="novaSenha"
        type="password"
        minLength={8}
        required
        className="h-11 text-base"
      />

      {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
      {estado.sucesso && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Senha redefinida. Entregue pessoalmente pro atendente.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={onCancelar}>
          Fechar
        </Button>
        <Button type="submit" className="h-11" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
