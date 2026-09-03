import { notFound } from "next/navigation";
import { tenantIdDaSessao } from "@/lib/sessao";
import { buscarTutor } from "@/lib/tutores";
import { FormularioNovoPet } from "./formulario";

export default async function PaginaNovoPet({
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
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Novo pet de {tutor.nome}</h1>
      <FormularioNovoPet tutorId={tutor.id} />
    </div>
  );
}
