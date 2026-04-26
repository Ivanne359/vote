"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import {
  Megaphone,
  CalendarDays,
  MapPin,
  Clock3,
  Shirt,
  Trophy,
  Pin,
  ArrowRight,
  Eye,
  BellRing,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const BANNER_IMAGES = ["/ban.jpg", "/ban2.jfif"];

const ANNOUNCEMENTS = [
  {
    id: 1,
    category: "Finance Notice",
    title: "CETSO 2nd Sem Membership Fee Collection (Extended)",
    short:
      "The collection of the CETSO 2nd Semester Membership Fee (₱50) has been extended due to the number of holidays.",
    badge: "Important",
    accent: "from-[#f05a28] to-orange-400",
    icon: Megaphone,
    stats: [
      { label: "Fee", value: "₱50" },
    ],
    details: {
      deadline: "April 7 - April 11",
      location: "CH402",
      schedule: "Tue-Sat",
    },
  },
  {
    id: 2,
    category: "Sports Update",
    title: "Growling Tigers Are Ready for Intrams",
    short:
      "The Growling Tigers are back to claim their rightful place at the peak of the jungle this season.",
    badge: "Upcoming Event",
    accent: "from-orange-500 to-amber-400",
    icon: Trophy,
    image: "/tigers.jpg",
    stats: [
      { label: "Team", value: "Growling Tigers" },
      { label: "Event", value: "CrossBlazers Cup 2026" },
      { label: "Energy", value: "100%" },
    ],
    content: `The 𝐆𝐫𝐨𝐰𝐥𝐢𝐧𝐠 𝐓𝐢𝐠𝐞𝐫𝐬 are back to claim their rightful place at the peak of the jungle. 🐅 🧡

This season, they’re showcasing the power of the stripe and the relentless nature of the hunt. They haven’t just kept their edge; they’ve sharpened it.

❤️🤍🩵
#CrossBlazersCup2026
#ReadyToWinAndBlazeAhead
#TrailBlazeHCDCSSG`,
    details: {
      campaign: "CrossBlazers Cup 2026",
      spirit: "Ready To Win",
      team: "Growling Tigers",
    },
  },
  {
    id: 3,
    category: "Merch Drop",
    title: "Last Stock for This Batch of Pins",
    short:
      "Pins are now available for only ₱25 each. Grab yours while supplies last at CH403 (Openlab).",
    badge: "Limited Stock",
    accent: "from-gray-900 to-gray-700",
    icon: Pin,
    stats: [
      { label: "Price", value: "₱25" },
      { label: "Pickup", value: "CH403" },
      { label: "Type", value: "Openlab" },
    ],
    content: `Last stock for this batch of pins.

₱25 each only.
Buy yours now at CH403 (Openlab).

Limited pieces only, so secure yours while supplies last.`,
    details: {
      price: "₱25 each",
      location: "CH403 (Openlab)",
      availability: "Last stock",
    },
  },
];

export default function HomePage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<
    (typeof ANNOUNCEMENTS)[0] | null
  >(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const privacyNoticeRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const openPrivacyModal = () => {
    setShowPrivacyModal(true);
    setHasReadPrivacy(false);
    setPrivacyAgreed(false);
  };

  const closePrivacyModal = () => {
    setShowPrivacyModal(false);
  };

  const handlePrivacyScroll = () => {
    const el = privacyNoticeRef.current;
    if (!el) return;

    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (reachedBottom) {
      setHasReadPrivacy(true);
    }
  };

  const handleContinueToVote = () => {
    if (!hasReadPrivacy) {
      alert("Please scroll to the bottom of the privacy notice first.");
      return;
    }

    if (!privacyAgreed) {
      alert("Please check the agreement box before continuing.");
      return;
    }

    closePrivacyModal();
    router.push("/vote/candidate");
  };

  return (
    <main className="min-h-screen bg-[#FDFCFB] font-poppins pb-28 selection:bg-[#f05a28]/20">
      <Navbar />

      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-[#f05a28] z-[110] origin-left"
        style={{ scaleX }}
      />

      {/* HERO */}
      <section className="relative w-full h-[650px] overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.5, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-0"
          >
            <img
              src={BANNER_IMAGES[currentSlide]}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#FDFCFB] via-black/20 to-black/80 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto h-full px-6 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-6 italic">
              CET CAMPUS <br />
              <span className="text-[#f05a28] drop-shadow-[0_0_30px_rgba(240,90,40,0.4)]">
                UPDATES.
              </span>
            </h1>

            <p className="text-xl text-gray-300 font-medium leading-relaxed mb-12 max-w-2xl">
              Stay informed with the latest CET announcements, activities,
              schedules, intrams updates, and department reminders — all in one
              streamlined hub.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                type="button"
                onClick={openPrivacyModal}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#f05a28] text-white font-black uppercase tracking-tight shadow-2xl shadow-[#f05a28]/20 hover:scale-[1.02] transition-all"
              >
                View Candidates <ArrowRight size={18} />
              </button>

              <button
                onClick={() => {
                  document
                    .getElementById("announcements-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white font-black uppercase tracking-tight hover:bg-white/15 transition-all"
              >
                Latest Advisory <Eye size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-12 right-12 z-20 flex gap-3">
          {BANNER_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentSlide ? "w-12 bg-[#f05a28]" : "w-4 bg-white/20"
              }`}
            />
          ))}
        </div>
      </section>

      {/* STICKY TOP BAR */}
      <div className="sticky top-0 z-[60] bg-white/90 backdrop-blur-2xl border-b border-gray-100 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#f05a28] border border-gray-100 font-black italic">
              {ANNOUNCEMENTS.length}
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Announcement Feed
              </p>
              <p className="text-sm font-black text-gray-900">
                {ANNOUNCEMENTS.length} active CET posts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openPrivacyModal}
              className="px-6 py-3 rounded-2xl bg-gray-50 text-gray-900 text-xs font-black uppercase tracking-tight hover:bg-gray-100 transition-all flex items-center gap-2"
            >
              Candidate Page <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENTS */}
      <section id="announcements-section" className="max-w-6xl mx-auto pt-20 px-6">
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-0.5 w-10 bg-[#f05a28]" />
            <p className="text-[#f05a28] text-[10px] font-black uppercase tracking-[0.35em]">
              CET Program Bulletin
            </p>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 italic uppercase">
            Campus Announcements
          </h2>
        </div>

        <div className="space-y-12">
          {ANNOUNCEMENTS.map((item, index) => (
            <motion.section
              key={item.id}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              className="relative"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-5">
                <div>
                  <h3 className="text-3xl font-[900] text-gray-900 uppercase tracking-tighter leading-none mb-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="h-0.5 w-8 bg-[#f05a28]" />
                    <p className="text-[#f05a28] text-[10px] font-black uppercase tracking-[0.3em]">
                      {item.category}
                    </p>
                  </div>
                </div>
              </div>

              <AnnouncementCard item={item} onOpen={() => setSelectedAnnouncement(item)} />
            </motion.section>
          ))}
        </div>
      </section>

      {/* MODAL */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
              onClick={closePrivacyModal}
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)]"
            >
              <div className="h-2 w-full bg-gradient-to-r from-[#f05a28] to-orange-400" />

              <div className="p-6 md:p-10">
                <div className="flex items-start justify-between gap-4 mb-7">
                  <div>
                    <p className="text-[10px] font-black text-[#f05a28] uppercase tracking-[0.3em] mb-3">
                      Data Privacy Notice
                    </p>
                    <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-tight">
                      Read Before Viewing Candidates
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closePrivacyModal}
                    className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-700 border border-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div
                  ref={privacyNoticeRef}
                  onScroll={handlePrivacyScroll}
                  className="max-h-[50vh] overflow-y-auto rounded-[2rem] border border-gray-100 bg-[#fcfcfc] p-6 md:p-7"
                >
                  <div className="space-y-6 text-gray-700 leading-8 text-[15px]">
                    <p>
                      This CET voting website is intended solely for the College of Engineering and
                      Technology election process. It allows student voters to verify their
                      identity, review election candidates, and cast their votes through an
                      organized and secure digital experience.
                    </p>
                    <p>
                      All information provided herein will be treated with confidentiality and
                      protected under the Data Privacy Act of 2012. By proceeding, you authorize
                      the collection, processing, and storage of voter information strictly for
                      election verification and official reporting requirements.
                    </p>
                    <p>
                      Your responses are used only for election operations. Unauthorized sharing,
                      tampering, or misuse of voter data is prohibited. You may stop at any time by
                      closing this modal before continuing to the candidate page.
                    </p>
                    <p>
                      Continuing confirms that you reviewed this notice completely and understand
                      the data handling terms associated with the CET election workflow.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyAgreed}
                      disabled={!hasReadPrivacy}
                      onChange={(e) => setPrivacyAgreed(e.target.checked)}
                      className="mt-1 h-5 w-5 accent-[#f05a28]"
                    />
                    <span className="text-sm text-gray-700 leading-7">
                      I have read the privacy notice and agree to continue to the candidate voting
                      page.
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-gray-500">
                    {hasReadPrivacy ? "Notice completed." : "Scroll down to unlock the checkbox."}
                  </p>

                  <button
                    type="button"
                    onClick={handleContinueToVote}
                    className={`px-8 py-4 rounded-2xl font-black uppercase tracking-tight flex items-center justify-center gap-3 transition-all ${
                      hasReadPrivacy && privacyAgreed
                        ? "bg-[#111] text-white hover:bg-[#f05a28] shadow-xl"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Continue to Vote <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedAnnouncement && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
              onClick={() => setSelectedAnnouncement(null)}
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)]"
            >
              <div
                className={`h-2 w-full bg-gradient-to-r ${selectedAnnouncement.accent}`}
              />

              <div className="p-6 md:p-10 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <p className="text-[10px] font-black text-[#f05a28] uppercase tracking-[0.3em] mb-3">
                      {selectedAnnouncement.category}
                    </p>
                    <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-tight">
                      {selectedAnnouncement.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-700 border border-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                {selectedAnnouncement.image && (
                  <div className="mb-8 overflow-hidden rounded-[2rem] border border-gray-100">
                    <img
                      src={selectedAnnouncement.image}
                      alt={selectedAnnouncement.title}
                      className="w-full h-[280px] md:h-[360px] object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {selectedAnnouncement.stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        {stat.label}
                      </p>
                      <p className="text-sm font-black text-gray-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[2rem] border border-gray-100 bg-[#fcfcfc] p-6 md:p-7">
                  <p className="whitespace-pre-line text-gray-700 leading-8 text-[15px]">
                    {selectedAnnouncement.content}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function AnnouncementCard({
  item,
  onOpen,
}: {
  item: (typeof ANNOUNCEMENTS)[0];
  onOpen: () => void;
}) {
  const Icon = item.icon;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-[0_20px_80px_-30px_rgba(0,0,0,0.18)]"
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(240,90,40,0.06),transparent_35%)]" />

      <div className="relative p-7 md:p-8">
        <div className="flex flex-col xl:flex-row gap-8 xl:items-center justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.accent} text-white flex items-center justify-center shadow-lg`}
              >
                <Icon size={24} />
              </div>

              <span className="inline-flex items-center rounded-full bg-orange-50 text-[#f05a28] border border-orange-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em]">
                {item.badge}
              </span>
            </div>

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.32em] mb-3">
              CET Program Update
            </p>

            <h4 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight mb-4">
              {item.title}
            </h4>

            <p className="text-gray-500 text-base leading-relaxed max-w-3xl">
              {item.short}
            </p>
          </div>

          {item.image ? (
            <div className="xl:w-[280px] shrink-0">
              <div className="overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-[220px] object-cover"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 mb-8">
          {item.stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-4 hover:bg-white transition-all"
            >
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {stat.label}
              </p>
              <p className="text-sm font-black text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-[#f05a28]" />
            Verified campus bulletin
          </div>

          <button
            onClick={onOpen}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#111] text-white font-black uppercase tracking-tight hover:bg-[#f05a28] transition-all shadow-xl"
          >
            Read Full Notice <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}