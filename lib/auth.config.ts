import type { NextAuthConfig } from "next-auth";

// Config edge-safe: sem Prisma, sem bcrypt. É o que roda no proxy.ts.
// Só decide quem pode passar; a validação de tenantId de cada operação
// continua sendo responsabilidade de cada Server Action.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const logado = !!auth?.user;
      const rotaProtegida = request.nextUrl.pathname.startsWith("/painel");
      return !rotaProtegida || logado;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
