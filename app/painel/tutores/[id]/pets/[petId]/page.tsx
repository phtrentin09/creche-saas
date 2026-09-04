import { notFound } from "next/navigation";
import { assinaturaAtualDoPet } from "@/lib/assinaturas";
import { hojeNoBrasil } from "@/lib/formatacao";
import { buscarPet } from "@/lib/pets";
import { listarPlanos } from "@/lib/planos";
import { tenantIdDaSessao, usuarioDaSessao } from "@/lib/sessao";
import { classificarVacina, listarVacinasDoPet } from "@/lib/vacinas";
import { FormularioEditarPet } from "./formulario";
import { SecaoAssinatura } from "./secao-assinatura";
import { SecaoVacinas } from "./secao-vacinas";

export default async function PaginaEditarPet({
  params,
}: {
  params: Promise<{ id: string; petId: string }>;
}) {
  const { id, petId } = await params;
  const tenantId = await tenantIdDaSessao();
  const usuario = await usuarioDaSessao();
  const pet = await buscarPet(tenantId, petId);

  if (!pet || pet.tutorId !== id) {
    notFound();
  }

  // Assinatura/plano é financeiro — atendente não vê essa seção.
  const souDono = usuario.papel === "dono";
  const [assinatura, planos, vacinasDoPet] = await Promise.all([
    souDono ? assinaturaAtualDoPet(tenantId, pet.id) : Promise.resolve(null),
    souDono ? listarPlanos(tenantId) : Promise.resolve([]),
    listarVacinasDoPet(tenantId, pet.id),
  ]);

  const hoje = hojeNoBrasil();
  const vacinas = vacinasDoPet.map((vacina) => ({
    ...vacina,
    situacao: classificarVacina(vacina.venceEm, hoje),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Editar {pet.nome}</h1>
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

      {souDono && (
        <SecaoAssinatura tutorId={id} petId={pet.id} assinatura={assinatura} planos={planos} />
      )}

      <SecaoVacinas tutorId={id} petId={pet.id} vacinas={vacinas} />
    </div>
  );
}
