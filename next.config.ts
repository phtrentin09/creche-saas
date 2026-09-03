import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que o Next tente rastrear/empacotar o binário do Prisma Client —
  // ele fica de fora do bundle e é carregado como módulo externo em runtime.
  serverExternalPackages: ["@prisma/client"],
  // Sem isso, o Next bloqueia por padrão qualquer requisição ao dev server
  // que não venha de localhost — inclui o webhook real do AbacatePay
  // chegando via túnel ngrok. Só afeta `next dev`, não entra no build de
  // produção (lá o Next não faz essa checagem).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
};

export default nextConfig;
