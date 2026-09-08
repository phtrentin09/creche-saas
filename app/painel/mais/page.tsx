import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usuarioDaSessao } from "@/lib/sessao";
import { sair } from "../acoes";

const itens = [
  { href: "/painel/planos", titulo: "Planos" },
  { href: "/painel/equipe", titulo: "Equipe" },
  { href: "/painel/configuracoes", titulo: "Configurações" },
];

// Acessível pros dois papéis — é onde "Sair" mora agora. O resto
// (planos, equipe, configurações) é financeiro/admin, só pro dono.
export default async function PaginaMais() {
  const usuario = await usuarioDaSessao();
  const souDono = usuario.papel === "dono";

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Mais</h1>

      {souDono && (
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
      )}

      <form action={sair} className="pt-2">
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
