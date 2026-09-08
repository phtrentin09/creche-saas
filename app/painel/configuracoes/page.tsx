import { chaveAbacatePayDoTenant, mascararChave } from "@/lib/configuracoes";
import { tenantIdDoDono } from "@/lib/sessao";
import { FormularioChaveAbacatePay } from "./formulario";

export default async function PaginaConfiguracoes() {
  const tenantId = await tenantIdDoDono();

  // A chave decifrada nunca sai desta função — só a versão mascarada vira
  // texto na página. Nenhum componente client recebe a chave em prop.
  const chavePlana = await chaveAbacatePayDoTenant(tenantId);
  const chaveMascarada = mascararChave(chavePlana);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-lg font-semibold">Configurações</h1>

      <section className="space-y-3">
        <h2 className="font-medium">AbacatePay</h2>
        <p className="text-sm text-muted-foreground">
          Chave da sua própria conta no AbacatePay, usada pra cobrar seus
          tutores. Fica cifrada no banco.
        </p>
        <FormularioChaveAbacatePay chaveMascarada={chaveMascarada} />
      </section>
    </div>
  );
}
