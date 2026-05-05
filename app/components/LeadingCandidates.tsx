"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Trophy, Medal } from "lucide-react";
import {
  ELECTION_POSITIONS,
  subscribeLiveAnalytics,
  subscribeCandidates,
  type CandidateRecord,
  type LiveAnalytics,
} from "@/lib/adminRealtime";

const emptyAnalytics: LiveAnalytics = {
  totalVoters: 0,
  totalVotes: 0,
  turnoutPercentage: 0,
  votesByPosition: {},
  activeSections: {},
  candidateCount: 0,
  candidateVotes: {},
  recentVotes: [],
};

interface LeadingCandidatesProps {
  variant?: "voter" | "admin"; // voter = simplified view, admin = detailed
  maxPositionsShow?: number; // How many positions to show (default: all)
  showHeader?: boolean;
}

export default function LeadingCandidates({ 
  variant = "voter", 
  maxPositionsShow = ELECTION_POSITIONS.length 
  , showHeader = true
}: LeadingCandidatesProps) {
  const [analytics, setAnalytics] = useState<LiveAnalytics>(emptyAnalytics);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);

  useEffect(() => {
    const unsub = subscribeLiveAnalytics("week", setAnalytics);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubCandidates = subscribeCandidates(setCandidates);
    return () => unsubCandidates();
  }, []);

  const topCandidates = useMemo(() => {
    return ELECTION_POSITIONS.slice(0, maxPositionsShow).map((position) => {
      const candidatesForPosition = candidates
        .filter((candidate) => candidate.position === position)
        .map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          votes: analytics.candidateVotes[candidate.id] ?? 0,
          partylist: candidate.partylist || "Independent",
        }))
        .sort((left, right) => right.votes - left.votes || left.name.localeCompare(right.name));

      if (position === "Business Manager (Select 2)") {
        return {
          position,
          leaders: candidatesForPosition.slice(0, 2),
          isSelectTwo: true,
        };
      }

      return {
        position,
        leaders: candidatesForPosition.slice(0, 2), // Top 2 (leader + runner-up)
        isSelectTwo: false,
      };
    });
  }, [analytics.candidateVotes, candidates, maxPositionsShow]);

  if (variant === "voter") {
    return (
      <section className="max-w-6xl mx-auto pt-12 pb-8 px-6">
        {showHeader && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="h-0.5 w-10 bg-[#f05a28]" />
              <p className="text-[#f05a28] text-[10px] font-black uppercase tracking-[0.35em]">
                Live Results
              </p>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 italic uppercase mb-8">
              Leading Candidates
            </h2>
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {topCandidates.map((item) => (
            <motion.div
              key={item.position}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[2rem] border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#f05a28] to-orange-400" />
              
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                  {item.position}
                </p>

                <div className="space-y-3">
                  {item.isSelectTwo ? (
                    // For Select-2 positions, show both leaders
                    item.leaders.length > 0 ? (
                      item.leaders.map((candidate, idx) => (
                        <motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-orange-100 bg-orange-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f05a28] text-white text-xs font-black">
                              #{idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-gray-900 truncate">
                                {candidate.name}
                              </p>
                              <p className="text-[10px] font-semibold text-gray-500">
                                {candidate.partylist}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-[#f05a28] whitespace-nowrap">
                            {candidate.votes}
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">No votes yet</p>
                    )
                  ) : (
                    // For regular positions
                    item.leaders.length > 0 ? (
                      <>
                        {/* Leader */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-[#fef6ee] to-[#fff7f2] border-2 border-[#f05a28]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Trophy size={18} className="text-[#f05a28] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                                Leading
                              </p>
                              <p className="text-sm font-black text-gray-900 truncate">
                                {item.leaders[0].name}
                              </p>
                              <p className="text-[10px] font-semibold text-gray-500">
                                {item.leaders[0].partylist}
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-black text-[#f05a28] whitespace-nowrap">
                            {item.leaders[0].votes}
                          </p>
                        </motion.div>

                        {/* Runner-up */}
                        {item.leaders.length > 1 && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Medal size={18} className="text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                                  Runner-up
                                </p>
                                <p className="text-sm font-black text-gray-900 truncate">
                                  {item.leaders[1].name}
                                </p>
                                <p className="text-[10px] font-semibold text-gray-500">
                                  {item.leaders[1].partylist}
                                </p>
                              </div>
                            </div>
                            <p className="text-lg font-black text-gray-400 whitespace-nowrap">
                              {item.leaders[1].votes}
                            </p>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">No votes yet</p>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  // Admin variant
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
    >
      <h2 className="text-2xl font-[900] text-gray-900 flex items-center gap-2">
        <TrendingUp size={22} className="text-[#f05a28]" /> Leading Candidates
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {topCandidates.map((leader) => (
          <div key={leader.position} className="flex flex-col rounded-3xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{leader.position}</p>

            {leader.isSelectTwo ? (
              <div className="mt-2 flex flex-1 flex-col justify-center space-y-2">
                {Array.isArray(leader.leaders) && leader.leaders.length > 0 ? (
                  leader.leaders.map((candidate, index) => (
                    <div key={`${leader.position}-${candidate.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-orange-100 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900">#{index + 1} {candidate.name}</p>
                        <p className="text-[10px] font-semibold text-gray-500">Vote leader</p>
                      </div>
                      <p className="whitespace-nowrap text-xs font-black text-[#f05a28]">{candidate.votes}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-gray-500">No candidate</p>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-center">
                {leader.leaders.length > 0 ? (
                  <>
                    <p className="mt-2 text-lg font-black text-gray-900">{leader.leaders[0].name}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-500">{leader.leaders[0].votes} vote{leader.leaders[0].votes === 1 ? "" : "s"}</p>
                    {leader.leaders[1] && (
                      <>
                        <p className="mt-3 text-xs font-black uppercase tracking-widest text-gray-400">Runner-up</p>
                        <p className="mt-1 text-sm font-semibold text-gray-600">{leader.leaders[1].name} ({leader.leaders[1].votes})</p>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-semibold text-gray-500">No votes yet</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.article>
  );
}
