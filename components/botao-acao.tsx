"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

type Estado = { erro?: string };

export function BotaoAcao({
  acao,
  children,
  variant = "outline",
  mensagemConfirmacao,
}: {
  acao: (estadoAnterior: Estado, formData: FormData) => Promise<Estado>;
  children: React.ReactNode;
  variant?: "outline" | "destructive" | "default" | "secondary" | "ghost";
  mensagemConfirmacao?: string;
}) {
  const [estado, dispatch, pendente] = useActionState(acao, {});

  return (
    <div>
      <form
        action={dispatch}
        onSubmit={(evento) => {
          if (mensagemConfirmacao && !confirm(mensagemConfirmacao)) {
            evento.preventDefault();
          }
        }}
      >
        <Button type="submit" variant={variant} size="sm" disabled={pendente} className="w-full">
          {pendente ? "Aguarde..." : children}
        </Button>
      </form>
      {estado.erro && <p className="mt-1 text-sm text-destructive">{estado.erro}</p>}
    </div>
  );
}
