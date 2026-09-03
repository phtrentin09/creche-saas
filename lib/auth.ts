import NextAuth from "next-auth";

// Providers ainda não configurados — isso é etapa futura.
// Por enquanto este arquivo só existe para o middleware ter o que checar
// e proteger /painel.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const logado = !!auth?.user;
      const rotaProtegida = request.nextUrl.pathname.startsWith("/painel");
      if (rotaProtegida && !logado) {
        return false;
      }
      return true;
    },
  },
});
