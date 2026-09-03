import path from "node:path";
import { config } from "dotenv";

// De propósito: carrega SÓ .env.test, nunca o .env de desenvolvimento.
// Os testes rodam contra um branch separado do Neon.
config({ path: path.resolve(__dirname, "..", ".env.test") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definida em .env.test. Configure a URL de um branch " +
      "de teste do Neon (separado do banco de desenvolvimento) antes de rodar os testes.",
  );
}
