import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buscarCobrancaPorToken, urlPagamentoValida } from "@/lib/cobrancas";
import { formatarCompetencia, formatarMoeda } from "@/lib/formatacao";

export default async function PaginaPagar({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cobranca = await buscarCobrancaPorToken(token);

  if (!cobranca) {
    notFound();
  }

  let paga = cobranca.status === "paga";
  let urlPagamento = cobranca.urlPagamento;
  let erro: string | null = null;

  if (!paga) {
    try {
      const resultado = await urlPagamentoValida(cobranca.id);
      paga = resultado.paga;
      urlPagamento = resultado.urlPagamento;
    } catch (e) {
      erro = e instanceof Error ? e.message : "Não deu pra carregar o pagamento agora.";
    }
  }

  const tipoPlano = cobranca.assinatura.plano.tipo;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{cobranca.tenant.nome}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">{cobranca.assinatura.pet.nome}</p>
            <p className="text-sm text-muted-foreground">
              Competência: {formatarCompetencia(cobranca.competencia, tipoPlano)}
            </p>
            <p className="text-sm text-muted-foreground">
              Vencimento: {formatarCompetencia(cobranca.vencimento, tipoPlano)}
            </p>
          </div>

          <p className="text-2xl font-semibold">{formatarMoeda(cobranca.valorCentavos)}</p>

          {paga && (
            <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
              Pagamento confirmado. Obrigado!
            </p>
          )}

          {!paga && erro && <p className="text-sm text-destructive">{erro}</p>}

          {!paga && !erro && urlPagamento && (
            <Button render={<a href={urlPagamento} />} nativeButton={false} className="h-12 w-full text-base">
              Pagar com Pix
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
