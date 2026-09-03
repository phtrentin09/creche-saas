import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que o Next tente rastrear/empacotar o binário do Prisma Client —
  // ele fica de fora do bundle e é carregado como módulo externo em runtime.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
