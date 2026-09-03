export function formatarMoeda(valorCentavos: number): string {
  return (valorCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR");
}
