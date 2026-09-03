import { BotaoAcao } from "@/components/botao-acao";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { StatusAgendamento } from "@/lib/generated/prisma";
import { formatarHora } from "@/lib/formatacao";
import {
  checkInAction,
  checkOutAction,
  excluirAgendamentoAction,
  marcarFaltaAction,
} from "./acoes";

const rotuloStatus: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  presente: "Presente",
  saiu: "Saiu",
  falta: "Faltou",
};

const variantePorStatus: Record<
  StatusAgendamento,
  "default" | "secondary" | "destructive" | "outline"
> = {
  agendado: "outline",
  presente: "default",
  saiu: "secondary",
  falta: "destructive",
};

type AgendamentoComPet = {
  id: string;
  status: StatusAgendamento;
  checkInEm: Date | null;
  checkOutEm: Date | null;
  pet: {
    id: string;
    nome: string;
    tutor: { nome: string };
  };
};

export function LinhaAgendamento({
  agendamento,
  emAtraso,
}: {
  agendamento: AgendamentoComPet;
  emAtraso: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{agendamento.pet.nome}</p>
            <p className="text-sm text-muted-foreground">{agendamento.pet.tutor.nome}</p>
          </div>
          <Badge variant={variantePorStatus[agendamento.status]}>
            {rotuloStatus[agendamento.status]}
          </Badge>
        </div>

        {emAtraso && <Badge variant="destructive">Mensalidade em atraso</Badge>}

        {agendamento.status === "saiu" && agendamento.checkInEm && agendamento.checkOutEm && (
          <p className="text-sm text-muted-foreground">
            {formatarHora(agendamento.checkInEm)} → {formatarHora(agendamento.checkOutEm)}
          </p>
        )}

        {agendamento.status === "agendado" && (
          <div className="grid grid-cols-3 gap-2">
            <BotaoAcao acao={checkInAction.bind(null, agendamento.id)}>Chegou</BotaoAcao>
            <BotaoAcao acao={marcarFaltaAction.bind(null, agendamento.id)} variant="secondary">
              Faltou
            </BotaoAcao>
            <BotaoAcao
              acao={excluirAgendamentoAction.bind(null, agendamento.id)}
              variant="ghost"
              mensagemConfirmacao={`Remover ${agendamento.pet.nome} da agenda?`}
            >
              Remover
            </BotaoAcao>
          </div>
        )}

        {agendamento.status === "presente" && (
          <BotaoAcao acao={checkOutAction.bind(null, agendamento.id)}>Saiu</BotaoAcao>
        )}
      </CardContent>
    </Card>
  );
}
