"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, Pause, Play, RotateCcw, Save, ShieldAlert } from "lucide-react";
import {
  resetElectionVotes,
  pushSystemNotification,
  saveElectionSettings,
  setVotingActive,
  subscribeElectionSettings,
  type ElectionSettings,
} from "@/lib/adminRealtime";

const defaultSettings: ElectionSettings = {
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "17:00",
  isActive: false,
};

export default function AdminElectionPage() {
  const [settings, setSettings] = useState<ElectionSettings>(defaultSettings);
  const [form, setForm] = useState<ElectionSettings>(defaultSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const unsub = subscribeElectionSettings((data) => {
      setSettings(data);
      setForm(data);
    });
    return () => unsub();
  }, []);

  const electionWindow = useMemo(() => {
    return `${form.startDate} ${form.startTime} - ${form.endDate} ${form.endTime}`;
  }, [form]);

  const onSave = async () => {
    setBusy(true);
    setMessage("");
    try {
      await saveElectionSettings({
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      await pushSystemNotification({
        title: "Election schedule updated",
        description: `${form.startDate} ${form.startTime} → ${form.endDate} ${form.endTime}`,
        kind: "election",
        actionHref: "/#announcements-section",
        actionLabel: "Open Announcements",
      });
      setMessage("Election schedule saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save schedule.");
    } finally {
      setBusy(false);
    }
  };

  const onToggleVoting = async () => {
    setBusy(true);
    setMessage("");
    try {
      const nextActive = !settings.isActive;
      await setVotingActive(nextActive);
      await pushSystemNotification({
        title: nextActive ? "Voting is now OPEN" : "Voting is now CLOSED",
        description: `${form.startDate} ${form.startTime} → ${form.endDate} ${form.endTime}`,
        kind: "election",
        actionHref: "/#announcements-section",
        actionLabel: "View Announcement",
      });
      setMessage(nextActive ? "Voting opened successfully." : "Voting closed successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update voting status.");
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    const confirmed = window.confirm("This will delete all votes and close election. Continue?");
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      await resetElectionVotes();
      setMessage("Election reset complete. All ballots deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reset election.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-[#fff2e9] p-8"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#f05a28]">Election Control</p>
        <h1 className="mt-2 text-4xl font-[900] tracking-tight text-gray-900 italic">Live Election Command</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium text-gray-600">
          Control the election window, open or close voting instantly, and reset ballots for testing.
        </p>
      </motion.section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <CalendarClock className="text-[#f05a28]" size={22} />
            <h2 className="text-2xl font-[900] text-gray-900">Election Schedule</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#f05a28]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#f05a28]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#f05a28]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#f05a28]"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              disabled={busy}
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f05a28] px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              <Save size={16} /> Save Schedule
            </button>
            <p className="text-xs font-semibold text-gray-500">{electionWindow}</p>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
        >
          <h2 className="text-2xl font-[900] text-gray-900">Voting State</h2>
          <div className={`mt-5 rounded-2xl border px-4 py-4 ${settings.isActive ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Current</p>
            <p className={`mt-2 text-2xl font-black ${settings.isActive ? "text-green-600" : "text-gray-700"}`}>
              {settings.isActive ? "OPEN" : "CLOSED"}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">Last reset: {settings.lastReset ? new Date(settings.lastReset).toLocaleString() : "Never"}</p>
          </div>

          <button
            disabled={busy}
            onClick={onToggleVoting}
            className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition disabled:opacity-60 ${settings.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {settings.isActive ? <Pause size={16} /> : <Play size={16} />}
            {settings.isActive ? "Close Voting" : "Open Voting"}
          </button>
        </motion.article>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border-2 border-red-200 bg-red-50 p-7"
      >
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="text-red-600" size={20} />
          <h3 className="text-xl font-[900] text-red-900">Danger Zone</h3>
        </div>
        <p className="text-sm font-semibold text-red-700">
          Reset removes all vote documents and switches voting to closed mode. Use only for testing or new election cycle.
        </p>
        <button
          disabled={busy}
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          <RotateCcw size={16} /> Reset Election Data
        </button>
      </motion.section>

      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-black ${message.toLowerCase().includes("unable") || message.toLowerCase().includes("error") ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={15} /> {message}
          </span>
        </div>
      ) : null}
    </div>
  );
}
