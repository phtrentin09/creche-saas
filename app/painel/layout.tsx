import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { sair } from "./acoes";

export default async function LayoutPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  // Checagem redundante ao proxy.ts: aqui é onde a sessão é lida de fato
  // para montar a tela, então também é onde garantimos o redirecionamento.
  const sessao = await auth();
  if (!sessao?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <span className="font-semibold">Creche</span>
        <form action={sair}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </header>
      <main className="mx-auto max-w-md p-4">{children}</main>
    </div>
  );
}
