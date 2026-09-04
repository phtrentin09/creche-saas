import { headers } from "next/headers";

type Balde = { contagem: number; expiraEm: number };

// Em memória, por processo — best-effort de propósito. Em serverless
// (Vercel) cada instância/cold start tem seu próprio mapa, então isso
// NÃO é uma trava global entre regiões ou instâncias simultâneas: barra
// o abuso óbvio (mesmo processo sendo martelado repetidamente), não
// substitui um limitador de verdade (Redis/Upstash) se o tráfego algum
// dia justificar. Ver PENDENCIAS.md.
const baldes = new Map<string, Balde>();

// Evita crescimento sem limite do Map ao longo da vida do processo —
// varredura oportunista, só quando o mapa cresce demais.
function limparExpirados(agora: number) {
  if (baldes.size < 1000) return;
  for (const [chave, balde] of baldes) {
    if (balde.expiraEm < agora) baldes.delete(chave);
  }
}

/**
 * true = pode seguir, false = estourou o limite. `escopo` identifica a
 * ação (ex: "login", "cadastro") pra não misturar contadores entre rotas
 * diferentes que compartilham o mesmo IP.
 */
export async function dentroDoLimite(
  escopo: string,
  maxTentativas: number,
  janelaMs: number,
): Promise<boolean> {
  const cabecalhos = await headers();
  // Vercel injeta x-forwarded-for com o IP real do cliente na primeira posição.
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
  const chave = `${escopo}:${ip}`;
  const agora = Date.now();

  limparExpirados(agora);

  const balde = baldes.get(chave);
  if (!balde || balde.expiraEm < agora) {
    baldes.set(chave, { contagem: 1, expiraEm: agora + janelaMs });
    return true;
  }

  if (balde.contagem >= maxTentativas) {
    return false;
  }

  balde.contagem += 1;
  return true;
}
