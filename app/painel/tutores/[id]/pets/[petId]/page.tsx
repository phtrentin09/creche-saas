import { notFound } from "next/navigation";
import { tenantIdDaSessao } from "@/lib/sessao";
import { buscarPet } from "@/lib/pets";
import { FormularioEditarPet } from "./formulario";

export default async function PaginaEditarPet({
  params,
}: {
  params: Promise<{ id: string; petId: string }>;
}) {
  const { id, petId } = await params;
  const tenantId = await tenantIdDaSessao();
  const pet = await buscarPet(tenantId, petId);

  if (!pet || pet.tutorId !== id) {
    notFound();
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
}
