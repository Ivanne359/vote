"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminNavbar from "./components/AdminNavbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === "/admin/login") {
      return;
    }

    const adminSession = localStorage.getItem("adminSession");
    if (!adminSession) {
      router.push("/admin/login");
      return;
    }

    try {
      const parsedSession = JSON.parse(adminSession) as { expiresAt?: string };
      if (!parsedSession.expiresAt || Number.isNaN(new Date(parsedSession.expiresAt).getTime()) || new Date(parsedSession.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem("adminSession");
        router.push("/admin/login");
      }
    } catch {
      localStorage.removeItem("adminSession");
      router.push("/admin/login");
    }
  }, [router, pathname]);

  // For login page, don't show navbar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(240,90,40,0.08),_transparent_32%),linear-gradient(180deg,_#fffdfa_0%,_#fbf8f5_100%)] font-poppins">
      <AdminNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
