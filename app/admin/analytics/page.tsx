"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BarChart3, Download, FileSpreadsheet, Gauge, Users, Vote } from "lucide-react";
import {
  ELECTION_POSITIONS,
  resolveElectionWindow,
  subscribeCandidates,
  subscribeElectionSettings,
  subscribeLiveAnalytics,
  type CandidateRecord,
  type ElectionSettings,
  type LiveAnalytics,
} from "@/lib/adminRealtime";
import LeadingCandidates from "@/app/components/LeadingCandidates";
import { downloadElectionResultsExcel } from "@/lib/adminExcelReport";

type DateRange = "today" | "week" | "month";

const emptyAnalytics: LiveAnalytics = {
  totalVoters: 0,
  totalVotes: 0,
  turnoutPercentage: 0,
  votesByPosition: Object.fromEntries(ELECTION_POSITIONS.map((pos) => [pos, 0])),
  activeSections: {},
  candidateCount: 0,
  candidateVotes: {},
  recentVotes: [],
};

const defaultElection: ElectionSettings = {
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "17:00",
  isActive: false,
};

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("week");
  const [analytics, setAnalytics] = useState<LiveAnalytics>(emptyAnalytics);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [election, setElection] = useState<ElectionSettings>(defaultElection);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [lastReportName, setLastReportName] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeLiveAnalytics(range, setAnalytics);
    return () => unsub();
  }, [range]);

  useEffect(() => {
    const unsubCandidates = subscribeCandidates(setCandidates);
    return () => unsubCandidates();
  }, []);

  useEffect(() => {
    const unsubElection = subscribeElectionSettings(setElection);
    return () => unsubElection();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const endDateTime = useMemo(() => {
    const window = resolveElectionWindow(election.startDate, election.startTime, election.endDate, election.endTime);
    return window.end;
  }, [election.endDate, election.endTime, election.startDate, election.startTime]);

  const hasElectionEnded = useMemo(() => {
    if (!endDateTime) return false;
    return nowTick >= endDateTime.getTime();
  }, [endDateTime, nowTick]);

  const handleDownloadReport = () => {
    if (!hasElectionEnded) {
      setReportError("Report download is available only after voting closes.");
      return;
    }

    try {
      setReportError(null);
      const fileName = downloadElectionResultsExcel({
        candidates,
        candidateVotes: analytics.candidateVotes,
        electionSettings: election,
      });
      setLastReportName(fileName);
    } catch {
      setReportError("Failed to generate Excel report. Please try again.");
    }
  };

  const maxPositionVotes = useMemo(() => {
    const values = Object.values(analytics.votesByPosition);
    return values.length ? Math.max(...values) : 1;
  }, [analytics.votesByPosition]);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-[#fff2e9] p-8"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#f05a28]">Analytics</p>
            <h1 className="mt-2 text-4xl font-[900] tracking-tight text-gray-900 italic md:text-5xl">Results Dashboard</h1>
            <p className="mt-3 text-sm font-medium text-gray-600">Metrics update automatically as new users register and votes are submitted.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as DateRange)}
              className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-gray-800 outline-none focus:border-[#f05a28]"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={!hasElectionEnded}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111] px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#f05a28] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
            >
              <Download size={16} /> Download .xlsx
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide ${hasElectionEnded ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            <FileSpreadsheet size={14} /> {hasElectionEnded ? "Result is ready to download" : "Report locked until voting ends"}
          </div>
          {lastReportName ? (
            <p className="text-xs font-semibold text-gray-600">Latest file: {lastReportName}</p>
          ) : null}
          {reportError ? <p className="text-xs font-semibold text-red-600">{reportError}</p> : null}
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

        <LeadingCandidates variant="admin" maxPositionsShow={8} />
      </section>
    </div>
  );
}
