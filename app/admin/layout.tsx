import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminNavbar from "./components/AdminNavbar";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSessionToken(sessionToken);

  const headersList = await headers();
  const pathname =
    headersList.get("x-invoke-pathname") ||
    headersList.get("x-nextjs-pathname") ||
    headersList.get("x-original-url") ||
    "";
  const isLoginRoute = typeof pathname === "string" && pathname.startsWith("/admin/login");

  if (!session && isLoginRoute) {
    return <>{children}</>;
  }

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(240,90,40,0.08),_transparent_32%),linear-gradient(180deg,_#fffdfa_0%,_#fbf8f5_100%)] font-poppins">
      <AdminNavbar adminEmail={session.email} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
