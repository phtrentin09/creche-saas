import { tenantIdDoDono } from "@/lib/sessao";
import { criarPlanoAction } from "../acoes";
import { FormularioPlano } from "../formulario-plano";

export default async function PaginaNovoPlano() {
  await tenantIdDoDono();

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Novo plano</h1>
      <FormularioPlano acao={criarPlanoAction} />
    </div>
  );
}
