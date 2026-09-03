import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { tenantIdDoDono } from "@/lib/sessao";

const itens = [
  { href: "/painel/planos", titulo: "Planos" },
  { href: "/painel/equipe", titulo: "Equipe" },
  { href: "/painel/configuracoes", titulo: "Configurações" },
];

export default async function PaginaMais() {
  await tenantIdDoDono();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Mais</h1>
      <ul className="space-y-3">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="py-4">
                  <p className="font-medium">{item.titulo}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
