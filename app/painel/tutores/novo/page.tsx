import { FormularioNovoTutor } from "./formulario";

export default function PaginaNovoTutor() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Novo tutor</h1>
      <FormularioNovoTutor />
    </div>
  );
}
