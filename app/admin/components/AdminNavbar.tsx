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

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession");
    if (adminSession) {
      const session = JSON.parse(adminSession);
      setAdminEmail(session.email);
    }
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    router.push("/admin/login");
  };

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-orange-100/80 bg-white/85 backdrop-blur-2xl shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/admin/dashboard" className="group flex items-center gap-3">
          <div className="rounded-xl bg-[#f05a28]/10 p-2 transition-colors group-hover:bg-[#f05a28]/20">
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
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#f05a28]/10 text-[#f05a28] shadow-sm"
                    : "text-gray-600 hover:bg-orange-50"
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
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 shadow-lg shadow-green-500/20" 
                : "bg-gray-100 border border-gray-200 text-gray-600"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isVotingOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isVotingOpen ? "Voting Open" : "Voting Closed"}
          </motion.div>

          <div className="hidden sm:flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5">
            <span className="text-xs font-bold text-gray-600">
              {adminEmail.split("@")[0]}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-black transition-colors hover:bg-orange-50 md:hidden"
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
          className="space-y-2 border-b border-orange-100 bg-white p-4 md:hidden"
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
