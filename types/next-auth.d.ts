import type { Papel } from "@/lib/generated/prisma";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      papel: Papel;
    } & DefaultSession["user"];
  }

  interface User {
    tenantId: string;
    papel: Papel;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tenantId: string;
    papel: Papel;
  }
}
