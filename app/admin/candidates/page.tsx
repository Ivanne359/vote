"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Edit3, ImagePlus, Plus, Trash2, X, AlertCircle, CheckCircle2, User } from "lucide-react";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ELECTION_POSITIONS,
  subscribeCandidates,
  upsertCandidate,
  removeCandidate,
  type CandidateRecord,
} from "@/lib/adminRealtime";

type CandidateForm = {
  name: string;
  position: string;
  section: string;
  partylist: string;
  motto: string;
  platform: string;
  biography: string;
  achievements: string;
  experience: string;
  goals: string;
  socialLinks: string;
  photoUrl: string;
};

const emptyForm: CandidateForm = {
  name: "",
  position: ELECTION_POSITIONS[0],
  section: "",
  partylist: "",
  motto: "",
  platform: "",
  biography: "",
  achievements: "",
  experience: "",
  goals: "",
  socialLinks: "",
  photoUrl: "",
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read image."));
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
};


export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateRecord | null>(null);
  const [form, setForm] = useState<CandidateForm>(emptyForm);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = subscribeCandidates(setCandidates);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const groupedCount = useMemo(() => {
    const map: Record<string, number> = {};
    candidates.forEach((candidate) => {
      map[candidate.position] = (map[candidate.position] ?? 0) + 1;
    });
    return map;
  }, [candidates]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedPhotoFile(null);
    setModalOpen(true);
  };

  const openEdit = (candidate: CandidateRecord) => {
    setEditing(candidate);
    setSelectedPhotoFile(null);

    setForm({
      name: candidate.name,
      position: candidate.position,
      section: candidate.section ?? "",
      partylist: candidate.partylist ?? "",
      motto: candidate.motto ?? "",
      platform: candidate.platform ?? "",
      biography: candidate.biography ?? "",
      achievements: candidate.achievements ?? "",
      experience: candidate.experience ?? "",
      goals: candidate.goals ?? "",
      socialLinks: candidate.socialLinks ?? "",
      photoUrl: candidate.photoUrl ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
  };

  const onPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const previewUrl = await fileToDataUrl(file);
      setSelectedPhotoFile(file);
      setForm((prev) => ({ ...prev, photoUrl: previewUrl }));
      setFeedback("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to process image");
    }
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!form.name.trim()) {
      errors.name = "Name";
    }
    if (!form.position.trim()) {
      errors.position = "Position";
    }
    if (!form.section.trim()) {
      errors.section = "Section";
    }
    if (!form.platform.trim()) {
      errors.platform = "Platform";
    }

    if (Object.keys(errors).length > 0) {
      const missingFields = Object.values(errors).join(", ");
      setFeedback(`Missing required fields: ${missingFields}`);
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const candidatePayload = {
        name: form.name.trim(),
        position: form.position,
        section: form.section.trim(),
        partylist: form.partylist.trim(),
        motto: form.motto.trim(),
        platform: form.platform.trim(),
        biography: form.biography.trim(),
        achievements: form.achievements.trim(),
        experience: form.experience.trim(),
        goals: form.goals.trim(),
        socialLinks: form.socialLinks.trim(),
      };

      let candidateId = editing?.id;
      let finalPhotoUrl = "";

      // Preserve existing photo URL if not editing or if editing without selecting a new photo
      if (editing && !selectedPhotoFile) {
        finalPhotoUrl = editing.photoUrl || "";
      }

      if (selectedPhotoFile) {
        const storageService = storage;
        if (!storageService) {
          throw new Error("Firebase Storage is not configured.");
        }

        if (!candidateId) {
          candidateId = await upsertCandidate(
            {
              ...candidatePayload,
              photoUrl: "",
            },
          );
        }

        const safeFileName = selectedPhotoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageRef = ref(storageService, `candidate-photos/${candidateId}/${Date.now()}-${safeFileName}`);
        await uploadBytes(storageRef, selectedPhotoFile, {
          contentType: selectedPhotoFile.type || "image/jpeg",
        });
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      await upsertCandidate(
        {
          ...candidatePayload,
          photoUrl: finalPhotoUrl,
        },
        candidateId,
      );
      
      setModalOpen(false);
      setSelectedPhotoFile(null);
      setForm(emptyForm);
      setEditing(null);
      setFeedback(`Candidate ${editing ? 'updated' : 'added'} successfully`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save candidate");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this candidate?");
    if (!confirmed) return;

    try {
      await removeCandidate(id);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete candidate.");
    }
  };

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-[#fff7f2] via-white to-[#fff2e9] p-8"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#f05a28]">Candidate Management</p>
            <h1 className="mt-2 text-4xl font-[900] tracking-tight text-gray-900 italic md:text-5xl">Candidate Board</h1>
            <p className="mt-3 text-sm font-medium text-gray-600">Add, edit, delete, and assign candidates by position in real time.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f05a28] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-[#f05a28]/30 transition hover:bg-orange-600"
          >
            <Plus size={18} /> Add Candidate
          </button>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ELECTION_POSITIONS.slice(0, 8).map((position) => (
          <div key={position} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{position}</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{groupedCount[position] ?? 0}</p>
          </div>
        ))}
      </section>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 left-4 right-4 z-[160] rounded-2xl px-4 py-3 text-sm font-bold shadow-lg max-w-md mx-auto flex items-center gap-2 ${
              feedback.toLowerCase().includes("unable") || feedback.toLowerCase().includes("error") || feedback.toLowerCase().includes("missing")
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.toLowerCase().includes("unable") || feedback.toLowerCase().includes("error") || feedback.toLowerCase().includes("missing") ? (
              <AlertCircle size={18} className="flex-shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="flex-shrink-0" />
            )}
            <span>{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {candidates.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-base font-black text-gray-700">No candidates yet</p>
            <p className="mt-2 text-sm font-medium text-gray-500">Add your first candidate to start the election lineup.</p>
          </div>
        ) : (
          candidates.map((candidate) => (
            <motion.article
              key={candidate.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="relative h-52 w-full bg-gradient-to-br from-orange-50 to-orange-100 overflow-hidden flex items-center justify-center group">
                {candidate.photoUrl && !imageLoadErrors[candidate.id] ? (
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="relative w-full h-full"
                  >
                    <Image 
                      src={candidate.photoUrl} 
                      alt={candidate.name} 
                      fill 
                      className='object-contain group-hover:brightness-110 transition-all duration-300 p-2'
                      onError={() => setImageLoadErrors((prev) => ({ ...prev, [candidate.id]: true }))}
                      unoptimized
                      priority={false}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className='text-orange-200'
                  >
                    <User size={72} />
                  </motion.div>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <p className="text-lg font-black text-gray-900">{candidate.name}</p>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f05a28]">{candidate.position}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidate.partylist ? (
                    <span className="inline-flex rounded-full border border-[#ffd9c6] bg-[#fff4ec] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#f05a28]">
                      {candidate.partylist}
                    </span>
                  ) : null}
                </div>

                {candidate.motto ? (
                  <p className="text-xs italic font-semibold text-gray-500 line-clamp-2">"{candidate.motto}"</p>
                ) : null}

                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                  Section: {candidate.section || "Not set"}
                </div>

                <p className="line-clamp-3 text-sm text-gray-600">{candidate.platform || "No campaign platform yet."}</p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(candidate)}
                    className="flex-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Edit3 size={15} /> Edit
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(candidate.id)}
                    className="flex-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-700 transition hover:bg-red-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 size={15} /> Delete
                    </span>
                  </button>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </section>

      <AnimatePresence>
        {modalOpen ? (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-7 py-5">
                <h2 className="text-2xl font-black text-gray-900">{editing ? "Edit Candidate" : "Add Candidate"}</h2>
                <button onClick={closeModal} className="rounded-full p-2 text-black transition hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={onSave} className="space-y-5 overflow-y-auto px-7 pb-7 pt-5">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500">Photo</p>
                  {form.photoUrl ? (
                    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white">
                      <Image 
                        src={form.photoUrl} 
                        alt="Candidate preview" 
                        fill 
                        className="object-contain p-2"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, photoUrl: "" }));
                          setSelectedPhotoFile(null);
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-6 text-sm font-black text-gray-600 transition hover:border-[#f05a28] hover:text-[#f05a28]"
                    >
                      <ImagePlus size={18} /> Upload Candidate Photo
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoUpload} className="hidden" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-gray-500">Name <span className="text-red-500">*</span></label>
                    <motion.input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="Candidate full name"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-gray-500">Section <span className="text-red-500">*</span></label>
                    <motion.input
                      value={form.section}
                      onChange={(event) => setForm((prev) => ({ ...prev, section: event.target.value }))}
                      className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="BSIT-3A"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Partylist / Group</label>
                    <motion.input
                      value={form.partylist}
                      onChange={(event) => setForm((prev) => ({ ...prev, partylist: event.target.value }))}
                      className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="Future Leaders"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Short Motto / Slogan</label>
                  <motion.input
                    value={form.motto}
                    onChange={(event) => setForm((prev) => ({ ...prev, motto: event.target.value }))}
                    className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                    placeholder="Service Before Self"
                    whileFocus={{ scale: 1.01 }}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-gray-500">Position <span className="text-red-500">*</span></label>
                  <motion.select
                    value={form.position}
                    onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                    className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                    whileFocus={{ scale: 1.01 }}
                  >
                    {ELECTION_POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </motion.select>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-gray-500">Platform <span className="text-red-500">*</span></label>
                  <motion.textarea
                    rows={4}
                    value={form.platform}
                    onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                    placeholder="Candidate platform and promises"
                    whileFocus={{ scale: 1.01 }}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Biography / Background</label>
                  <motion.textarea
                    rows={3}
                    value={form.biography}
                    onChange={(event) => setForm((prev) => ({ ...prev, biography: event.target.value }))}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                    placeholder="Brief candidate background"
                    whileFocus={{ scale: 1.01 }}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Achievements</label>
                    <motion.textarea
                      rows={3}
                      value={form.achievements}
                      onChange={(event) => setForm((prev) => ({ ...prev, achievements: event.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="Awards and notable achievements"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Experience / Leadership Roles</label>
                    <motion.textarea
                      rows={3}
                      value={form.experience}
                      onChange={(event) => setForm((prev) => ({ ...prev, experience: event.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="Past organizations and leadership roles"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Goals If Elected</label>
                    <motion.textarea
                      rows={3}
                      value={form.goals}
                      onChange={(event) => setForm((prev) => ({ ...prev, goals: event.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="Priority goals once elected"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">Social Links (optional)</label>
                    <motion.textarea
                      rows={3}
                      value={form.socialLinks}
                      onChange={(event) => setForm((prev) => ({ ...prev, socialLinks: event.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/10"
                      placeholder="Facebook, Instagram, etc."
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <motion.button
                    disabled={busy}
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 rounded-xl bg-[#f05a28] px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy ? "Saving..." : editing ? "Update Candidate" : "Add Candidate"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
