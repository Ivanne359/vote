"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Clock,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { resolveElectionWindow, subscribeElectionSettings, type ElectionSettings } from "@/lib/adminRealtime";

const ADMIN_MENU = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "Election Control", href: "/admin/election", icon: Clock },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export default function AdminNavbar({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const unsub = subscribeElectionSettings((settings) => {
      setSettings(settings);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const electionWindow = resolveElectionWindow(settings?.startDate, settings?.startTime, settings?.endDate, settings?.endTime);
  const start = electionWindow.start;
  const end = electionWindow.end;
  const isVotingOpen = Boolean(start && end && currentTime >= start && currentTime <= end);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
    });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-orange-100/70 bg-white/80 backdrop-blur-2xl shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/admin/dashboard" className="group flex items-center gap-3">
          <div className="rounded-2xl border border-orange-100 bg-[#fff7f2] p-2.5 shadow-sm transition-colors group-hover:bg-[#fff0e8]">
            <Image
              src="/cet.png"
              alt="CET Admin"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <h1 className="font-[900] text-lg tracking-tighter text-gray-900 italic">
              CET<span className="text-[#f05a28]">ADMIN</span>
            </h1>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                  className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                  isActive
                      ? "bg-[#f05a28]/10 text-[#f05a28] shadow-sm ring-1 ring-[#f05a28]/10"
                      : "text-gray-600 hover:bg-orange-50/80 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`hidden sm:flex items-center gap-2 rounded-2xl px-4 py-2.5 font-black uppercase tracking-wider text-xs transition-all ${
              isVotingOpen 
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 shadow-[0_12px_28px_-18px_rgba(16,185,129,0.6)]" 
                : "bg-gray-100 border border-gray-200 text-gray-600"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isVotingOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isVotingOpen ? "Voting Open" : "Voting Closed"}
          </motion.div>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-orange-100 bg-[#fff7f2] px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-gray-700">
              {adminEmail ? adminEmail.split("@")[0] : "Admin"}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-2xl p-2 text-black transition-colors hover:bg-orange-50 md:hidden"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="rounded-2xl p-2.5 text-black transition-all hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:shadow-red-500/20"
            title="Sign Out"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 border-b border-orange-100 bg-white/95 p-4 md:hidden"
        >
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? "bg-[#f05a28]/10 text-[#f05a28]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </motion.div>
      )}
    </nav>
  );
}
