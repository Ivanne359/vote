"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Sparkles, User } from "lucide-react";

interface CandidateCardProps {
  name: string;
  section: string;
  bio: string;
  partylist?: string;
  motto?: string;
  image?: string;
  isSelected: boolean;
  onSelect: () => void;
  onViewProfile?: () => void;
  onVoteNow?: () => void;
  candidateId?: string;
}

export default function CandidateCard({
  name,
  section,
  bio,
  partylist,
  motto,
  image,
  isSelected,
  onSelect,
  onViewProfile,
  onVoteNow,
  candidateId,
}: CandidateCardProps) {
  // Try to get photo from localStorage first
  let photoSrc = image;
  if (!photoSrc && candidateId) {
    const storedPhoto = typeof window !== "undefined" ? localStorage.getItem(`candidate_${candidateId}_photo`) : null;
    photoSrc = storedPhoto || undefined;
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -8 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`group relative mx-auto w-full max-w-[350px] cursor-pointer overflow-hidden rounded-[2.4rem] border-2 transition-all duration-300 ${
        isSelected
          ? "border-[#f05a28] bg-white shadow-[0_24px_65px_-28px_rgba(240,90,40,0.6)]"
          : "border-gray-200 bg-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.35)] hover:border-[#f05a28]/35 hover:shadow-[0_26px_55px_-25px_rgba(15,23,42,0.45)]"
      }`}
    >
      <motion.div
        className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        initial={{ x: "-140%" }}
        whileHover={{ x: "420%" }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />

      {/* Photo Section */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-[#fef6ee] via-[#fffaf5] to-[#fbead8] flex items-center justify-center">
        {photoSrc ? (
          <motion.div
            whileHover={{ scale: 1.06 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <Image src={photoSrc} alt={name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[#f2c89f]"
            >
              <User size={72} />
            </motion.div>
          </motion.div>
        )}

        <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f05a28] backdrop-blur">
          <Sparkles size={12} /> Candidate
        </div>
        
        {/* Selection overlay */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#f05a28]/12 backdrop-blur-[1.5px]"
          />
        )}
      </div>

      {/* Info Section */}
      <div className="space-y-3 p-6">
        <motion.div layout>
          <h3 className="line-clamp-2 text-xl font-black uppercase leading-tight tracking-tight text-[#101828]">{name}</h3>
          <p className="mt-2 inline-flex rounded-full border border-[#ffd9c6] bg-[#fff4ec] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f05a28]">
            {section}
          </p>
        </motion.div>

        <motion.p 
          layout
          className="line-clamp-3 border-l-2 border-[#ffe5d6] pl-3 text-sm font-medium leading-relaxed text-gray-600"
        >
          {bio}
        </motion.p>

        <motion.div layout className="space-y-2 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {partylist ? (
              <span className="inline-flex items-center rounded-full border border-[#ffe0cd] bg-[#fff6ef] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f05a28]">
                {partylist}
              </span>
            ) : null}
          </div>
          {motto ? (
            <p className="line-clamp-2 text-xs font-semibold italic text-gray-500">"{motto}"</p>
          ) : null}
        </motion.div>

        <motion.div layout className="flex items-center justify-between border-t border-gray-100 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Candidate Profile
          </p>
          <motion.div
            initial={false}
            animate={isSelected ? { scale: 1 } : { scale: 0.92 }}
          >
            {isSelected ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#f05a28] px-3 py-1.5 text-xs font-black uppercase tracking-tight text-white"
              >
                <CheckCircle2 size={14} /> Selected
              </motion.div>
            ) : (
              <span className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-black uppercase tracking-tight text-gray-500">
                Not Selected
              </span>
            )}
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              (onVoteNow || onSelect)();
            }}
            className="rounded-xl bg-[#f05a28] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-orange-600"
          >
            Vote Now
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              (onViewProfile || onSelect)();
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-gray-700 transition hover:bg-gray-100"
          >
            View Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}
