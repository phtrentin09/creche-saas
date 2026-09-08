"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavPainel({ souDono }: { souDono: boolean }) {
  const pathname = usePathname();

  // "Mais" existe pros dois papéis — é onde fica "Sair" agora, tirado do
  // header genérico. Atendente só vê "Sair" lá dentro (o resto do
  // conteúdo de "Mais" é financeiro/admin, só pro dono).
  const itens = [
    { href: "/painel/agenda", rotulo: "Agenda", prefixos: ["/painel/agenda"] },
    { href: "/painel/tutores", rotulo: "Tutores", prefixos: ["/painel/tutores"] },
    ...(souDono
      ? [{ href: "/painel/cobrancas", rotulo: "Cobranças", prefixos: ["/painel/cobrancas"] }]
      : []),
    {
      href: "/painel/mais",
      rotulo: "Mais",
      prefixos: ["/painel/mais", "/painel/planos", "/painel/equipe", "/painel/configuracoes"],
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card pb-2">
      {itens.map((item) => {
        const ativo = item.prefixos.some((prefixo) => pathname.startsWith(prefixo));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 border-t-2 pt-[11px] pb-3 text-center text-[12.5px]",
              ativo
                ? "-mt-px border-primary font-bold text-brand-900"
                : "border-transparent font-normal text-muted-foreground",
            )}
          >
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
