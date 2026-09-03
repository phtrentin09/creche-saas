import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioLogin } from "./formulario";

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Entrar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormularioLogin />
          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem cadastro?{" "}
            <Link href="/cadastro" className="underline">
              Cadastre sua creche
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
