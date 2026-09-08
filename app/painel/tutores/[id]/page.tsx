import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BotaoExcluir } from "@/components/botao-excluir";
import { tenantIdDaSessao } from "@/lib/sessao";
import { buscarTutor } from "@/lib/tutores";
import { excluirTutorAction } from "../acoes";
import { excluirPetAction } from "./pets-acoes";
import { FormularioTutor } from "./formulario-tutor";

export default async function PaginaTutor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await tenantIdDaSessao();
  const tutor = await buscarTutor(tenantId, id);

  if (!tutor) {
    notFound();
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-lg font-semibold">{tutor.nome}</h1>

      <FormularioTutor
        tutorId={tutor.id}
        valoresIniciais={{
          nome: tutor.nome,
          telefone: tutor.telefone,
          cpf: tutor.cpf,
          email: tutor.email,
        }}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Pets</h2>
          <Button
            render={<Link href={`/painel/tutores/${tutor.id}/pets/novo`} />}
            nativeButton={false}
            size="sm"
          >
            + Novo pet
          </Button>
        </div>

        {tutor.pets.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum pet cadastrado.</p>
        )}

        <ul className="space-y-3">
          {tutor.pets.map((pet) => (
            <li key={pet.id}>
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{pet.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {[pet.raca, pet.porte].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      render={<Link href={`/painel/tutores/${tutor.id}/pets/${pet.id}`} />}
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <BotaoExcluir
                      acao={excluirPetAction.bind(null, tutor.id, pet.id)}
                      mensagemConfirmacao={`Excluir ${pet.nome}?`}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <BotaoExcluir
        acao={excluirTutorAction.bind(null, tutor.id)}
        mensagemConfirmacao={`Excluir ${tutor.nome} e todos os pets dele?`}
        className="w-full"
      >
        Excluir tutor
      </BotaoExcluir>
    </div>
  );
}
