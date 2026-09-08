import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assinaturaAtualDoPet } from "@/lib/assinaturas";
import { listarUltimosAgendamentosDoPet } from "@/lib/agenda";
import {
  formatarDataDiaAbreviada,
  formatarHora,
  hojeNoBrasil,
  linkWhatsApp,
} from "@/lib/formatacao";
import { buscarPet } from "@/lib/pets";
import { listarPlanos } from "@/lib/planos";
import { usuarioDaSessao } from "@/lib/sessao";
import { buscarTutor } from "@/lib/tutores";
import { classificarVacina, listarVacinasDoPet } from "@/lib/vacinas";
import { FormularioEditarPet } from "./formulario";
import { SecaoAssinatura } from "./secao-assinatura";
import { SecaoVacinas } from "./secao-vacinas";

function TituloCartao({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export default async function PaginaEditarPet({
  params,
}: {
  params: Promise<{ id: string; petId: string }>;
}) {
  const { id, petId } = await params;
  const usuario = await usuarioDaSessao();
  const tenantId = usuario.tenantId;
  const [pet, tutor] = await Promise.all([
    buscarPet(tenantId, petId),
    buscarTutor(tenantId, id),
  ]);

  if (!pet || !tutor || pet.tutorId !== id) {
    notFound();
  }

  // Assinatura/plano é financeiro — atendente não vê essa seção.
  const souDono = usuario.papel === "dono";
  const [assinatura, planos, vacinasDoPet, ultimosAgendamentos] = await Promise.all([
    souDono ? assinaturaAtualDoPet(tenantId, pet.id) : Promise.resolve(null),
    souDono ? listarPlanos(tenantId) : Promise.resolve([]),
    listarVacinasDoPet(tenantId, pet.id),
    listarUltimosAgendamentosDoPet(tenantId, pet.id),
  ]);

  const hoje = hojeNoBrasil();
  const umDiaMs = 1000 * 60 * 60 * 24;
  const vacinas = vacinasDoPet.map((vacina) => ({
    ...vacina,
    situacao: classificarVacina(vacina.venceEm, hoje),
    dias: Math.abs(Math.round((vacina.venceEm.getTime() - hoje.getTime()) / umDiaMs)),
  }));

  const hojeISO = hoje.toISOString().slice(0, 10);
  const agendamentoDeHoje = ultimosAgendamentos.find(
    (a) => a.data.toISOString().slice(0, 10) === hojeISO,
  );
  const presenteAgora = agendamentoDeHoje?.status === "presente";

  const subtitulo = [pet.raca, pet.porte, pet.castrado ? "Castrado" : null]
    .filter(Boolean)
    .join(" · ");

  const mensagemWhatsApp = `Oi, ${tutor.nome}! Aqui é da creche, sobre o(a) ${pet.nome}.`;

  return (
    <div>
      <header className="bg-brand-900 px-4 pt-3.5 pb-[18px]">
        <Link
          href="/painel/agenda"
          className="-m-2.5 inline-flex min-h-11 items-center p-2.5 text-[13px] text-on-dark-muted"
        >
          ‹ Agenda
        </Link>
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-heading text-[26px] font-bold tracking-[-0.02em] text-white">
              {pet.nome}
            </p>
            {subtitulo && <p className="mt-1 truncate text-[13px] text-on-dark-muted">{subtitulo}</p>}
          </div>
          {presenteAgora && (
            <Badge variant="teal" className="shrink-0">
              Presente
            </Badge>
          )}
        </div>
      </header>

      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <TituloCartao>Tutor</TituloCartao>
              <p className="mt-2 text-[16px] font-semibold">{tutor.nome}</p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {tutor.telefone}
                {tutor.email ? ` · ${tutor.email}` : ""}
              </p>
            </div>
            <Button
              render={
                <a href={linkWhatsApp(tutor.telefone, mensagemWhatsApp)} target="_blank" rel="noreferrer" />
              }
              nativeButton={false}
              variant="outline"
              className="h-11 w-[88px] shrink-0 border-[1.5px] border-primary text-primary"
            >
              WhatsApp
            </Button>
          </div>

          {pet.observacoes && (
            <div className="mt-3.5 border-t border-line-soft pt-3.5">
              <p className="text-[11.5px] text-muted-foreground">Observações</p>
              <p className="mt-1 text-[13.5px]">{pet.observacoes}</p>
            </div>
          )}
        </div>

        {souDono && (
          <SecaoAssinatura tutorId={id} petId={pet.id} assinatura={assinatura} planos={planos} />
        )}

        <SecaoVacinas tutorId={id} petId={pet.id} vacinas={vacinas} />

        <div className="rounded-xl border border-border bg-card p-4">
          <TituloCartao>Presenças recentes</TituloCartao>
          {ultimosAgendamentos.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
          ) : (
            <ul>
              {ultimosAgendamentos.map((agendamento, indice) => (
                <li
                  key={agendamento.id}
                  className={`flex items-center justify-between py-[9px] ${
                    indice < ultimosAgendamentos.length - 1 ? "border-b border-line-soft" : ""
                  }`}
                >
                  {agendamento.status === "falta" ? (
                    <>
                      <span className="text-[14px] text-muted-foreground">
                        {formatarDataDiaAbreviada(agendamento.data)}
                      </span>
                      <span className="text-[12.5px] font-bold tracking-[0.04em] text-ink-2 uppercase">
                        Faltou
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[14px]">{formatarDataDiaAbreviada(agendamento.data)}</span>
                      {agendamento.checkInEm && agendamento.checkOutEm ? (
                        <span className="font-heading text-[14px] font-semibold text-ink-2">
                          {formatarHora(agendamento.checkInEm)} → {formatarHora(agendamento.checkOutEm)}
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-muted-foreground">Em andamento</span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <FormularioEditarPet
          tutorId={id}
          petId={pet.id}
          valoresIniciais={{
            nome: pet.nome,
            raca: pet.raca,
            porte: pet.porte,
            castrado: pet.castrado,
            observacoes: pet.observacoes,
          }}
        />
      </div>
    </div>
  );
}
