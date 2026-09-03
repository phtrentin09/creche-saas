import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        senha: {},
      },
      async authorize(credenciais) {
        const email = credenciais?.email;
        const senha = credenciais?.senha;
        if (typeof email !== "string" || typeof senha !== "string") {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) {
          return null;
        }

        const senhaValida = await compare(senha, usuario.senhaHash);
        if (!senhaValida) {
          return null;
        }

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          tenantId: usuario.tenantId,
          papel: usuario.papel,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.papel = user.papel;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.tenantId = token.tenantId;
      session.user.papel = token.papel;
      return session;
    },
  },
});
