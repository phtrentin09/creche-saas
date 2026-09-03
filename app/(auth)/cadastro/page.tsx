import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioCadastro } from "./formulario";

export default function PaginaCadastro() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Cadastre sua creche</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioCadastro />
        </CardContent>
      </Card>
    </main>
  );
}
