import { listarEquipe } from "@/lib/equipe";
import { tenantIdDoDono } from "@/lib/sessao";
import { FormularioNovoAtendente } from "./formulario";
import { LinhaUsuario } from "./linha-usuario";

export default async function PaginaEquipe() {
  const tenantId = await tenantIdDoDono();
  const equipe = await listarEquipe(tenantId);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Equipe</h1>

      <ul className="space-y-3">
        {equipe.map((usuario) => (
          <li key={usuario.id}>
            <LinhaUsuario usuario={usuario} />
          </li>
        ))}
      </ul>

      <section className="space-y-3 border-t pt-4">
        <h2 className="font-medium">Adicionar atendente</h2>
        <p className="text-sm text-muted-foreground">
          Sem convite por e-mail — digite os dados e entregue a senha
          pessoalmente pro atendente.
        </p>
        <FormularioNovoAtendente />
      </section>

      {/*
        Esqueceu a própria senha (dono)? Ainda não tem fluxo na UI —
        só via script direto no banco (ver PENDENCIAS.md). Faz sentido
        só quando existir serviço de e-mail pra recuperação de verdade.
      */}
    </div>
  );
}
