import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Papel } from "@/lib/generated/prisma";
import { listarEquipe } from "@/lib/equipe";
import { tenantIdDoDono } from "@/lib/sessao";
import { FormularioNovoAtendente } from "./formulario";

const rotuloPapel: Record<Papel, string> = {
  dono: "Dono",
  atendente: "Atendente",
};

export default async function PaginaEquipe() {
  const tenantId = await tenantIdDoDono();
  const equipe = await listarEquipe(tenantId);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Equipe</h1>

      <ul className="space-y-3">
        {equipe.map((usuario) => (
          <li key={usuario.id}>
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{usuario.nome}</p>
                  <p className="text-sm text-muted-foreground">{usuario.email}</p>
                </div>
                <Badge variant={usuario.papel === "dono" ? "default" : "secondary"}>
                  {rotuloPapel[usuario.papel]}
                </Badge>
              </CardContent>
            </Card>
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
    </div>
  );
}
