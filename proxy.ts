export { auth as proxy } from "@/lib/auth.edge";

export const config = {
  matcher: ["/painel/:path*"],
};
