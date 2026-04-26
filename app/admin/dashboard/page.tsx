"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import {
  subscribeElectionSettings,
  subscribeLiveAnalytics,
  type ElectionSettings,
  type LiveAnalytics,
} from "@/lib/adminRealtime";

const defaultAnalytics: LiveAnalytics = {
  totalVoters: 0,
  totalVotes: 0,
  turnoutPercentage: 0,
  votesByPosition: {},
  activeSections: {},
  candidateCount: 0,
  recentVotes: [],
};

const defaultElection: ElectionSettings = {
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "17:00",
  isActive: false,
};

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<LiveAnalytics>(defaultAnalytics);
  const [election, setElection] = useState<ElectionSettings>(defaultElection);

  useEffect(() => {
    const unsubAnalytics = subscribeLiveAnalytics("week", setAnalytics);
    const unsubElection = subscribeElectionSettings(setElection);

    return () => {
      unsubAnalytics();
      unsubElection();
    };
  }, []);

  const topSection = useMemo(() => {
    const ranked = Object.entries(analytics.activeSections).sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[0] ?? "No data yet";
  }, [analytics.activeSections]);

  const cards = [
    {
      label: "Registered Voters",
      value: analytics.totalVoters,
      hint: "From users collection",
      icon: Users,
      tone: "from-sky-50 to-cyan-100 text-sky-700",
      href: "/admin/analytics",
    },
    {
      label: "Votes Cast",
      value: analytics.totalVotes,
      hint: "Realtime ballot count",
      icon: Vote,
      tone: "from-amber-50 to-orange-100 text-orange-700",
      href: "/admin/analytics",
    },
    {
      label: "Candidates",
      value: analytics.candidateCount,
      hint: "Manage candidate list",
      icon: Activity,
      tone: "from-emerald-50 to-teal-100 text-emerald-700",
      href: "/admin/candidates",
    },
    {
      label: "Turnout",
      value: `${analytics.turnoutPercentage.toFixed(1)}%`,
      hint: "Live participation rate",
      icon: BarChart3,
      tone: "from-violet-50 to-fuchsia-100 text-violet-700",
      href: "/admin/analytics",
    },
  ];

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-[#fff2e9] p-8 md:p-10 shadow-[0_28px_80px_-48px_rgba(240,90,40,0.9)]"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#f05a28]">Control Center</p>
            <h1 className="mt-2 text-4xl font-[900] tracking-tight text-gray-900 italic md:text-5xl">Admin Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium text-gray-600">
              Live snapshot of turnout, candidates, and election activity. All cards below refresh in realtime from Firebase.
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white/80 px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Voting Status</p>
            <p className={`mt-2 text-lg font-black ${election.isActive ? "text-green-600" : "text-gray-600"}`}>
              {election.isActive ? "OPEN" : "CLOSED"}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {election.startDate} {election.startTime} - {election.endDate} {election.endTime}
            </p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index }}
            >
              <Link
                href={card.href}
                className={`block rounded-3xl border border-white bg-gradient-to-br p-6 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-1 ${card.tone}`}
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <Icon size={22} />
                  </div>
                  <Zap size={16} className="opacity-75" />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-gray-500">{card.label}</p>
                <p className="mt-2 text-3xl font-[900] tracking-tight text-gray-900">{card.value}</p>
                <p className="mt-2 text-xs font-semibold text-gray-600">{card.hint}</p>
              </Link>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-[900] text-gray-900">Recent Ballots</h2>
            <CheckCircle2 className="text-[#f05a28]" size={22} />
          </div>
          <div className="mt-6 space-y-3">
            {analytics.recentVotes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-semibold text-gray-500">
                No votes submitted yet.
              </p>
            ) : (
              analytics.recentVotes.map((vote) => (
                <div
                  key={vote.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-black text-gray-900">{vote.voterName}</p>
                    <p className="text-xs font-semibold text-gray-500">{vote.section}</p>
                  </div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#f05a28]">Recorded</p>
                </div>
              ))
            )}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-[900] text-gray-900">Quick Actions</h2>
            <CalendarClock className="text-[#f05a28]" size={22} />
          </div>
          <div className="mt-6 grid gap-3">
            <Link href="/admin/candidates" className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm font-black text-orange-700 transition hover:bg-orange-100">
              Manage Candidate Profiles
            </Link>
            <Link href="/admin/election" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">
              Open, Close, or Reset Election
            </Link>
            <Link href="/admin/analytics" className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100">
              View Turnout and Section Activity
            </Link>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Most Active Section</p>
              <p className="mt-2 text-xl font-black text-gray-900">{topSection}</p>
            </div>
          </div>
        </motion.article>
      </section>
    </div>
  );
}
