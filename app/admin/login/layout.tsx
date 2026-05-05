import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSessionToken(sessionToken);

  if (session) {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
