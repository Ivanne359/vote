"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Lock, Mail, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Invalid admin credentials.");
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach the authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#FAFAFA] overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[40%] bg-[#f05a28]/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[40%] bg-orange-200/20 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[460px]"
      >
        <div className="bg-white/80 backdrop-blur-2xl p-6 xs:p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-white ring-1 ring-black/[0.03]">
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mb-4">
              <Image
                src="/cet.png"
                alt="CET Logo"
                width={90}
                height={90}
                className="mx-auto drop-shadow-xl w-[100px] h-[100px]"
                priority
              />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-[900] text-gray-900 tracking-tighter italic">
              CET<span className="text-[#f05a28] ml-1">ADMIN</span>
            </h1>
            <p className="text-[10px] font-700 text-gray-400 uppercase tracking-[0.2em] mt-2">
              Management Portal
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm"
            >
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-xs font-semibold">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-[900] text-gray-900 uppercase tracking-[0.15em] mb-2.5">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hcdc.edu.ph"
                  autoComplete="username"
                  spellCheck={false}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#f05a28]/50 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-[900] text-gray-900 uppercase tracking-[0.15em] mb-2.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#f05a28]/50 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-[#f05a28] hover:bg-[#f05a28]/5 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-black text-white font-[900] py-3.5 rounded-2xl uppercase tracking-widest text-sm hover:bg-[#f05a28] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/20 hover:shadow-[#f05a28]/50"
            >
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
