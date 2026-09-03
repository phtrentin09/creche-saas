"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavPainel({ souDono }: { souDono: boolean }) {
  const pathname = usePathname();

  const itens = [
    { href: "/painel/agenda", rotulo: "Agenda" },
    { href: "/painel/tutores", rotulo: "Tutores" },
    ...(souDono
      ? [
          { href: "/painel/planos", rotulo: "Planos" },
          { href: "/painel/equipe", rotulo: "Equipe" },
        ]
      : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background">
      {itens.map((item) => {
        const ativo = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 py-3 text-center text-sm",
              ativo ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
