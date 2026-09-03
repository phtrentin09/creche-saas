// Apaga TODOS os dados do banco apontado por DATABASE_URL. Só existe pra
// resetar o ambiente de dev antes de rodar prisma/seed.ts — nunca aponte
// isso pro branch de teste (.env.test) nem pra produção.
import { PrismaClient } from "../lib/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.match(/@([^/]+)\//)?.[1] ?? "(desconhecido)";
  console.log(`Limpando TODAS as tabelas do banco em: ${host}`);

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "EventoWebhook", "Vacina", "Agendamento", "Cobranca", "Assinatura",
      "Plano", "Pet", "Tutor", "Usuario", "Tenant"
    RESTART IDENTITY CASCADE;
  `);

  console.log("Banco limpo.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
