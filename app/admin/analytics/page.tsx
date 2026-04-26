"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BarChart3, Gauge, Users, Vote } from "lucide-react";
import { ELECTION_POSITIONS, subscribeLiveAnalytics, type LiveAnalytics } from "@/lib/adminRealtime";

type DateRange = "today" | "week" | "month";

const emptyAnalytics: LiveAnalytics = {
  totalVoters: 0,
  totalVotes: 0,
  turnoutPercentage: 0,
  votesByPosition: {},
  activeSections: {},
  candidateCount: 0,
  recentVotes: [],
};

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("week");
  const [analytics, setAnalytics] = useState<LiveAnalytics>(emptyAnalytics);

  useEffect(() => {
    const unsub = subscribeLiveAnalytics(range, setAnalytics);
    return () => unsub();
  }, [range]);

  const maxPositionVotes = useMemo(() => {
    const values = Object.values(analytics.votesByPosition);
    return values.length ? Math.max(...values) : 1;
  }, [analytics.votesByPosition]);

  const sortedSections = useMemo(() => {
    return Object.entries(analytics.activeSections).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [analytics.activeSections]);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-[#fff2e9] p-8"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#f05a28]">Live Analytics</p>
            <h1 className="mt-2 text-4xl font-[900] tracking-tight text-gray-900 italic">Realtime Election Insights</h1>
            <p className="mt-3 text-sm font-medium text-gray-600">Metrics update automatically as new users register and votes are submitted.</p>
          </div>

          <select
            value={range}
            onChange={(event) => setRange(event.target.value as DateRange)}
            className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-gray-800 outline-none focus:border-[#f05a28]"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </motion.section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Registered", value: analytics.totalVoters, icon: Users, tone: "text-sky-700 bg-sky-50" },
          { label: "Votes", value: analytics.totalVotes, icon: Vote, tone: "text-orange-700 bg-orange-50" },
          { label: "Turnout", value: `${analytics.turnoutPercentage.toFixed(1)}%`, icon: Gauge, tone: "text-emerald-700 bg-emerald-50" },
          { label: "Candidates", value: analytics.candidateCount, icon: Activity, tone: "text-violet-700 bg-violet-50" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.article
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{stat.label}</p>
                <div className={`rounded-xl p-2.5 ${stat.tone}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-4xl font-[900] tracking-tight text-gray-900">{stat.value}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
        >
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-[900] text-gray-900">
            <BarChart3 size={22} className="text-[#f05a28]" /> Votes per Position
          </h2>

          <div className="space-y-3">
            {ELECTION_POSITIONS.map((position) => {
              const value = analytics.votesByPosition[position] ?? 0;
              const width = maxPositionVotes === 0 ? 0 : (value / maxPositionVotes) * 100;

              return (
                <div key={position}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-600">{position}</p>
                    <p className="text-xs font-black text-[#f05a28]">{value}</p>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.45 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#f05a28] to-orange-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
        >
          <h2 className="text-2xl font-[900] text-gray-900">Most Active Sections</h2>
          <div className="mt-5 space-y-3">
            {sortedSections.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-semibold text-gray-500">
                No section activity yet.
              </p>
            ) : (
              sortedSections.map(([section, votes], index) => (
                <div key={section} className="flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f05a28] text-xs font-black text-white">{index + 1}</span>
                    <p className="text-sm font-black text-gray-800">{section}</p>
                  </div>
                  <p className="text-sm font-black text-[#f05a28]">{votes}</p>
                </div>
              ))
            )}
          </div>
        </motion.article>
      </section>
    </div>
  );
}
