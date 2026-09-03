import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Instância edge-safe separada da lib/auth.ts (que tem Prisma + bcrypt).
// Só existe para o proxy.ts ter uma função "auth" pra reexportar.
export const { auth } = NextAuth(authConfig);
