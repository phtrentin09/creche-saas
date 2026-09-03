// Cria uma cobrança real no AbacatePay (modo Dev, se a chave configurada
// for de Dev) usando a MESMA função que o app usa em produção — não uma
// cópia solta. Precisa que /painel/configuracoes já tenha uma chave salva.
import { criarCobrancaNoAbacatePay } from "../lib/abacatepay.ts";
import { descriptografar } from "../lib/criptografia.ts";
import { PrismaClient } from "../lib/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { chaveApiAbacate: { not: null } },
  });

  if (!tenant?.chaveApiAbacate) {
    throw new Error(
      "Nenhum tenant com chave do AbacatePay configurada. Configure em /painel/configuracoes primeiro.",
    );
  }

  console.log(`Testando com o tenant: ${tenant.nome}`);

  const chaveApi = descriptografar(tenant.chaveApiAbacate);

  const resultado = await criarCobrancaNoAbacatePay(chaveApi, {
    nome: "Cobrança de teste — creche-saas",
    valorCentavos: 100,
    externalId: `teste-${Date.now()}`,
  });

  console.log("Cobrança criada:");
  console.log(`  billingId:    ${resultado.billingId}`);
  console.log(`  urlPagamento: ${resultado.urlPagamento}`);
  console.log("Confira no painel do AbacatePay (aba Dev Mode).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
