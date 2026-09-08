import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavPainel } from "./nav";

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

  // Sem header genérico aqui de propósito: cada tela tem o próprio
  // cabeçalho (escuro, nas telas redesenhadas; título simples nas
  // demais). "Sair" mudou pra a tela "Mais".
  return (
    <div className="min-h-screen bg-background pb-16">
      <main className="mx-auto max-w-md">{children}</main>
      <NavPainel souDono={sessao.user.papel === "dono"} />
    </div>
  );
}
