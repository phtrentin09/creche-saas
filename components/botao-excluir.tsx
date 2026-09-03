"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

type Estado = { erro?: string };

export function BotaoExcluir({
  acao,
  mensagemConfirmacao,
  children = "Excluir",
  className,
}: {
  acao: (estadoAnterior: Estado, formData: FormData) => Promise<Estado>;
  mensagemConfirmacao: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [estado, dispatch, pendente] = useActionState(acao, {});

  return (
    <div className={className}>
      <form
        action={dispatch}
        onSubmit={(evento) => {
          if (!confirm(mensagemConfirmacao)) {
            evento.preventDefault();
          }
        }}
      >
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={pendente}
          className="w-full"
        >
          {pendente ? "Excluindo..." : children}
        </Button>
      </form>
      {estado.erro && <p className="mt-1 text-sm text-destructive">{estado.erro}</p>}
    </div>
  );
}
