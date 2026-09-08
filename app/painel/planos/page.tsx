import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/formatacao";
import { listarPlanos } from "@/lib/planos";
import { tenantIdDoDono } from "@/lib/sessao";

export default async function PaginaPlanos() {
  const tenantId = await tenantIdDoDono();
  const planos = await listarPlanos(tenantId);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Planos</h1>
        <Button render={<Link href="/painel/planos/novo" />} nativeButton={false} size="sm">
          + Novo plano
        </Button>
      </div>

      {planos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum plano cadastrado ainda.</p>
      )}

      <ul className="space-y-3">
        {planos.map((plano) => (
          <li key={plano.id}>
            <Link href={`/painel/planos/${plano.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{plano.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {plano.tipo === "mensal"
                        ? `Mensal · vence dia ${plano.diaVencimento}`
                        : `Pacote · ${plano.qtdDiarias} diárias`}
                    </p>
                  </div>
                  <span className="font-medium">{formatarMoeda(plano.valorCentavos)}</span>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
