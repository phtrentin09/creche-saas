import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { buscarPlano } from "@/lib/planos";
import { tenantIdDoDono } from "@/lib/sessao";
import { atualizarPlanoAction, excluirPlanoAction } from "../acoes";
import { FormularioPlano } from "../formulario-plano";

export default async function PaginaEditarPlano({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await tenantIdDoDono();
  const plano = await buscarPlano(tenantId, id);

  if (!plano) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{plano.nome}</h1>

      <FormularioPlano
        acao={atualizarPlanoAction.bind(null, plano.id)}
        valoresIniciais={{
          nome: plano.nome,
          tipo: plano.tipo,
          valorCentavos: plano.valorCentavos,
          qtdDiarias: plano.qtdDiarias,
          diaVencimento: plano.diaVencimento,
        }}
      />

      <BotaoExcluir
        acao={excluirPlanoAction.bind(null, plano.id)}
        mensagemConfirmacao={`Excluir o plano ${plano.nome}?`}
        className="w-full"
      >
        Excluir plano
      </BotaoExcluir>
    </div>
  );
}
