import { BotaoAcao } from "@/components/botao-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buscarPetsParaAgendar } from "@/lib/agenda";
import {
  dataDeStringISO,
  formatarDataDia,
  hojeNoBrasil,
  stringISODoDia,
} from "@/lib/formatacao";
import { tenantIdDaSessao } from "@/lib/sessao";
import { criarAgendamentoAction } from "../acoes";

export default async function PaginaNovoAgendamento({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; busca?: string }>;
}) {
  const { data: dataParam, busca = "" } = await searchParams;
  const tenantId = await tenantIdDaSessao();
  const dataISO = dataParam ?? stringISODoDia(hojeNoBrasil());

  const pets = await buscarPetsParaAgendar(tenantId, busca);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        Agendar para {formatarDataDia(dataDeStringISO(dataISO))}
      </h1>

      <form method="GET" className="flex gap-2">
        <input type="hidden" name="data" value={dataISO} />
        <Input
          name="busca"
          defaultValue={busca}
          placeholder="Buscar pet ou tutor"
          className="h-12 text-base"
        />
        <Button type="submit" variant="outline" className="h-12">
          Buscar
        </Button>
      </form>

      {pets.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum pet encontrado.</p>
      )}

      <ul className="space-y-3">
        {pets.map((pet) => (
          <li key={pet.id}>
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{pet.nome}</p>
                  <p className="text-sm text-muted-foreground">{pet.tutor.nome}</p>
                </div>
                <BotaoAcao acao={criarAgendamentoAction.bind(null, pet.id, dataISO)}>
                  Agendar
                </BotaoAcao>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
