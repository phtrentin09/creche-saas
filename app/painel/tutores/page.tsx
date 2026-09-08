import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tenantIdDaSessao } from "@/lib/sessao";
import { listarTutores } from "@/lib/tutores";

export default async function PaginaTutores() {
  const tenantId = await tenantIdDaSessao();
  const tutores = await listarTutores(tenantId);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tutores</h1>
        <Button render={<Link href="/painel/tutores/novo" />} nativeButton={false} size="sm">
          + Novo tutor
        </Button>
      </div>

      {tutores.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum tutor cadastrado ainda.
        </p>
      )}

      <ul className="space-y-3">
        {tutores.map((tutor) => (
          <li key={tutor.id}>
            <Link href={`/painel/tutores/${tutor.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{tutor.nome}</p>
                    <p className="text-sm text-muted-foreground">{tutor.telefone}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {tutor._count.pets} pet{tutor._count.pets === 1 ? "" : "s"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
