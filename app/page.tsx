import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const sessao = await auth();
  redirect(sessao?.user ? "/painel/agenda" : "/login");
}
