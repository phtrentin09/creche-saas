import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listarCobrancas,
  marcarCobrancasVencidas,
  resumoFinanceiro,
  urlBaseDoApp,
} from "@/lib/cobrancas";
import { formatarCompetencia, formatarMoeda, linkWhatsApp } from "@/lib/formatacao";
import type { StatusCobranca } from "@/lib/generated/prisma";
import { tenantIdDoDono } from "@/lib/sessao";
import { BotaoGerarCobrancas } from "./botao-gerar";

const rotuloStatus: Record<StatusCobranca, string> = {
  pendente: "Pendente",
  paga: "Paga",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const variantePorStatus: Record<
  StatusCobranca,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendente: "outline",
  paga: "default",
  vencida: "destructive",
  cancelada: "secondary",
};

function mensagemCobranca(cobranca: {
  valorCentavos: number;
  vencimento: Date;
  token: string;
  assinatura: { plano: { tipo: "mensal" | "pacote"; nome: string }; pet: { nome: string } };
}): string {
  const link = `${urlBaseDoApp()}/pagar/${cobranca.token}`;
  const vencimento = formatarCompetencia(cobranca.vencimento, cobranca.assinatura.plano.tipo);
  return (
    `Oi! A cobrança de ${cobranca.assinatura.pet.nome} (${cobranca.assinatura.plano.nome}), ` +
    `${formatarMoeda(cobranca.valorCentavos)}, venceu em ${vencimento}. ` +
    `Pode pagar por aqui: ${link}`
  );
}

export default async function PaginaCobrancas() {
  const tenantId = await tenantIdDoDono();
  await marcarCobrancasVencidas(tenantId);
  const [cobrancas, resumo] = await Promise.all([
    listarCobrancas(tenantId),
    resumoFinanceiro(tenantId),
  ]);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Cobranças</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Recebido no mês</p>
            <p className="text-lg font-semibold">
              {formatarMoeda(resumo.recebidoNoMesCentavos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Em atraso</p>
            <p className="text-lg font-semibold">{resumo.emAtraso.length}</p>
          </CardContent>
        </Card>
      </div>

      <BotaoGerarCobrancas />

      {cobrancas.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma cobrança gerada ainda.</p>
      )}

      <ul className="space-y-3">
        {cobrancas.map((cobranca) => (
          <li key={cobranca.id}>
            <Card>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cobranca.assinatura.pet.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {cobranca.assinatura.pet.tutor.nome} · {cobranca.assinatura.plano.nome}
                    </p>
                  </div>
                  <Badge variant={variantePorStatus[cobranca.status]}>
                    {rotuloStatus[cobranca.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Competência:{" "}
                  {formatarCompetencia(cobranca.competencia, cobranca.assinatura.plano.tipo)} ·
                  Vencimento:{" "}
                  {formatarCompetencia(cobranca.vencimento, cobranca.assinatura.plano.tipo)}
                </p>
                <p className="font-medium">{formatarMoeda(cobranca.valorCentavos)}</p>

                {(cobranca.status === "pendente" || cobranca.status === "vencida") && (
                  <Button
                    render={
                      <a
                        href={linkWhatsApp(
                          cobranca.assinatura.pet.tutor.telefone,
                          mensagemCobranca(cobranca),
                        )}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Cobrar pelo WhatsApp
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
