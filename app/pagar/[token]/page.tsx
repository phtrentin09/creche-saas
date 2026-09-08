import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  const { plano } = cobranca.assinatura;
  const descricao =
    plano.tipo === "mensal"
      ? `Mensalidade de ${cobranca.competencia.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })}`
      : `Pacote de ${plano.qtdDiarias} diárias`;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-brand-900 px-6 py-5 text-center">
        <p className="font-heading text-[17px] font-semibold text-white">{cobranca.tenant.nome}</p>
      </div>

      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="text-center">
          <p className="text-[15px] text-muted-foreground">Cobrança de</p>
          <p className="mt-0.5 font-heading text-[30px] font-bold tracking-[-0.02em]">
            {cobranca.assinatura.pet.nome}
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <div className="bg-background p-5 text-center">
            <p className="text-sm text-ink-2">{descricao}</p>
            <p className="mt-1 font-heading text-[44px] font-bold tracking-[-0.02em]">
              {formatarMoeda(cobranca.valorCentavos)}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <p className="text-[15px] text-ink-2">Vencimento</p>
            <p className="text-[16px] font-bold">
              {formatarCompetencia(cobranca.vencimento, plano.tipo)}
            </p>
          </div>
        </div>

        <div className="mt-10">
          {paga && (
            <div className="rounded-[10px] border border-success-border bg-success-bg p-4 text-[16px] font-semibold text-success-ink">
              Pagamento confirmado. Obrigado!
            </div>
          )}

          {!paga && erro && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg p-4 text-sm text-danger-ink">
              {erro}
            </div>
          )}

          {!paga && !erro && urlPagamento && (
            <>
              <Button
                render={<a href={urlPagamento} />}
                nativeButton={false}
                className="h-14 w-full rounded-[10px] text-[19px] font-bold"
              >
                Pagar com Pix
              </Button>
              <p className="mt-3 text-center text-sm leading-normal text-muted-foreground">
                Você vai ver o código Pix na próxima tela.
                <br />
                Pagamento confirmado na hora.
              </p>
            </>
          )}
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-[10px] bg-background p-4">
          <span className="size-2.5 shrink-0 rounded-full bg-success" />
          <p className="text-[13.5px] text-ink-2">
            Cobrança gerada por {cobranca.tenant.nome}.
            {cobranca.tenant.telefone && (
              <>
                {" "}
                Dúvidas? Chame no <strong>{cobranca.tenant.telefone}</strong>.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
