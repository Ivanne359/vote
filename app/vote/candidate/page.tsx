"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Navbar from "../../components/Navbar";
import CandidateCard from "../../components/CandidateCard";
import { auth, db } from "@/lib/firebase";
import { resolveElectionWindow, subscribeElectionSettings, type ElectionSettings, type CandidateRecord } from "@/lib/adminRealtime";
import {
	Send,
	CheckCircle,
	ShieldCheck,
	ChevronRight,
	LayoutList,
	Fingerprint,
	Lock,
	RefreshCcw,
	UserCircle2,
	Eye,
	EyeOff,
	ArrowRight,
	X,
	User,
	AlertCircle,
} from "lucide-react";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const POSITIONS = [
	"Moderator",
	"President",
	"Internal Vice President",
	"External Vice President",
	"Secretary",
	"Assistant Secretary",
	"Treasurer",
	"Assistant Treasurer",
	"Auditor",
	"Business Manager (Select 2)",
	"BSIT PIO",
	"BSCPE PIO",
	"BSECE PIO",
	"BLIS PIO",
];

type StepType = "form" | "ballot";

const STEP_STORAGE_KEY = "cetvote_step";
const SECTION_STORAGE_KEY = "cetvote_section";
const HIDE_NAME_STORAGE_KEY = "cetvote_hide_name";
const SELECTED_CANDIDATES_STORAGE_KEY = "cetvote_selected_candidates";

const SELECT_2_POSITIONS = ["Business Manager (Select 2)"];

const isSelectNPosition = (position: string) => SELECT_2_POSITIONS.includes(position);

const defaultElection: ElectionSettings = {
	startDate: new Date().toISOString().split("T")[0],
	endDate: new Date().toISOString().split("T")[0],
	startTime: "09:00",
	endTime: "17:00",
	isActive: false,
};

export default function CandidatesPage() {
	const [hasVoted, setHasVoted] = useState(false);
	const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string | string[]>>({});
	const [submittedVotes, setSubmittedVotes] = useState<Record<string, string | string[]>>();
	const [isConfirming, setIsConfirming] = useState(false);
	const [showSummary, setShowSummary] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
	const [liveCandidates, setLiveCandidates] = useState<CandidateRecord[]>([]);
	const [electionSettings, setElectionSettings] = useState<ElectionSettings>(defaultElection);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [activeCandidateModal, setActiveCandidateModal] = useState<{
		position: string;
		candidate: CandidateRecord;
	} | null>(null);

	const [step, setStep] = useState<StepType>("form");

	const [formData, setFormData] = useState({
		name: "",
		idNumber: "",
		section: "",
		hideName: false,
	});

	const [formErrors, setFormErrors] = useState({
		idNumber: "",
		section: "",
	});

	useEffect(() => {
		const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		const unsubElection = subscribeElectionSettings(setElectionSettings);
		return () => unsubElection();
	}, []);

	const electionWindow = resolveElectionWindow(
		electionSettings.startDate,
		electionSettings.startTime,
		electionSettings.endDate,
		electionSettings.endTime,
	);

	const electionStart = electionWindow.start;
	const electionEnd = electionWindow.end;
	const isVotingOpen = Boolean(
		electionStart &&
			electionEnd &&
			currentTime >= electionStart &&
			currentTime <= electionEnd,
	);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const storedStep = localStorage.getItem(STEP_STORAGE_KEY);
		const storedSection = localStorage.getItem(SECTION_STORAGE_KEY);
		const storedHideName = localStorage.getItem(HIDE_NAME_STORAGE_KEY);
		const storedCandidates = localStorage.getItem(SELECTED_CANDIDATES_STORAGE_KEY);

		if (storedSection) {
			setFormData((prev) => ({ ...prev, section: storedSection }));
		}

		if (storedHideName) {
			setFormData((prev) => ({ ...prev, hideName: storedHideName === "1" }));
		}

		if (storedCandidates) {
			try {
				const parsed = JSON.parse(storedCandidates) as Record<string, string | string[]>;
				if (parsed && typeof parsed === "object") {
					setSelectedCandidates(parsed);
				}
			} catch {
				// ignore invalid saved data
			}
		}

		if (storedStep === "ballot") {
			setStep("ballot");
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem(SECTION_STORAGE_KEY, formData.section);
		localStorage.setItem(HIDE_NAME_STORAGE_KEY, formData.hideName ? "1" : "0");
	}, [formData.section, formData.hideName]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem(SELECTED_CANDIDATES_STORAGE_KEY, JSON.stringify(selectedCandidates));
	}, [selectedCandidates]);

	const { scrollYProgress } = useScroll();
	const scaleX = useSpring(scrollYProgress, {
		stiffness: 100,
		damping: 30,
		restDelta: 0.001,
	});

	// Helper function to check if a position is fully selected
	const isPositionSelected = useCallback((position: string): boolean => {
		const selection = selectedCandidates[position];
		if (!selection) return false;
		
		// Abstain is always a valid selection
		if (selection === "abstain") return true;
		
		if (isSelectNPosition(position)) {
			// For select-2 positions, must have exactly 2 selections
			return Array.isArray(selection) && selection.length === 2;
		}
		// For regular positions, must be a non-empty string
		return typeof selection === "string" && selection.length > 0;
	}, [selectedCandidates]);

	const progress = useMemo(() => {
		const fullPositions = POSITIONS.filter(pos => isPositionSelected(pos)).length;
		return (fullPositions / POSITIONS.length) * 100;
	}, [selectedCandidates, isPositionSelected]);

	const selectedCount = POSITIONS.filter(pos => isPositionSelected(pos)).length;

	useEffect(() => {
		const savedName = typeof window !== "undefined" ? localStorage.getItem("voterName") : null;
		const savedId = typeof window !== "undefined" ? localStorage.getItem("voterId") : null;

		if (!auth || !db) {
			setFormData((prev) => ({
				...prev,
				name: savedName ?? prev.name,
				idNumber: savedId ?? prev.idNumber,
			}));
			setIsLoadingIdentity(false);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					setFormData((prev) => ({
						...prev,
						name: savedName ?? prev.name,
						idNumber: savedId ?? prev.idNumber,
					}));
					return;
				}

				const userDoc = await getDoc(doc(db!, "users", user.uid));
				const userData = userDoc.exists() ? userDoc.data() : null;
				const resolvedName =
					(userData?.fullName as string | undefined) ||
					(userData?.name as string | undefined) ||
					savedName ||
					user.displayName ||
					user.email ||
					"Voter";
				const resolvedId =
					(userData?.studentId as string | undefined) ||
					savedId ||
					user.uid.slice(0, 8);

				setFormData((prev) => ({
					...prev,
					name: resolvedName,
					idNumber: resolvedId,
				}));
			} finally {
				setIsLoadingIdentity(false);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		const database = db;
		if (!database) return;
		const id = formData.idNumber.trim();
		if (!id) return;

		let active = true;
		const checkVoteStatus = async () => {
			const voteRef = doc(database, "votes", id);
			const voteSnap = await getDoc(voteRef);
			if (!active) return;
			if (voteSnap.exists()) {
				setHasVoted(true);
			}
		};

		checkVoteStatus();

		return () => {
			active = false;
		};
	}, [db, formData.idNumber]);

	useEffect(() => {
		if (!db) return;

		const unsubscribe = onSnapshot(collection(db, "candidates"), (snapshot) => {
			const candidates = snapshot.docs.map((candidateDoc) => {
				const raw = candidateDoc.data();
				return {
					id: candidateDoc.id,
					name: String(raw.name ?? "Unnamed Candidate"),
					position: String(raw.position ?? ""),
					section: raw.section ? String(raw.section) : undefined,
					partylist: raw.partylist ? String(raw.partylist) : undefined,
					motto: raw.motto ? String(raw.motto) : undefined,
					platform: raw.platform ? String(raw.platform) : undefined,
					biography: raw.biography ? String(raw.biography) : undefined,
					achievements: raw.achievements ? String(raw.achievements) : undefined,
					experience: raw.experience ? String(raw.experience) : undefined,
					goals: raw.goals ? String(raw.goals) : undefined,
					socialLinks: raw.socialLinks ? String(raw.socialLinks) : undefined,
					photoUrl: raw.photoUrl ? String(raw.photoUrl) : undefined,
				};
			});

			setLiveCandidates(candidates);
		});

		return () => unsubscribe();
	}, []);

	const handleVoteSubmit = useCallback(() => {
		// Check all positions have valid selections
		const missing = POSITIONS.filter(pos => !isPositionSelected(pos));
		
		if (missing.length > 0) {
			const missingPos = missing[0];
			if (isSelectNPosition(missingPos)) {
				const currentSelection = selectedCandidates[missingPos];
				const count = Array.isArray(currentSelection) ? currentSelection.length : 0;
				alert(`Please select 2 candidates for ${missingPos}. You have selected ${count}/2.`);
			} else {
				alert(`Please cast your vote for: ${missingPos}`);
			}
			return;
		}
		setIsConfirming(true);
	}, [selectedCandidates, isPositionSelected]);

	const finalSubmit = useCallback(async () => {
		if (!db) {
			alert("Firebase is not configured.");
			return;
		}

		setSubmitting(true);

		try {
			const voteId = formData.idNumber.trim();

			await runTransaction(db, async (transaction) => {
				const voteRef = doc(db!, "votes", voteId);
				const existingVote = await transaction.get(voteRef);

				if (existingVote.exists()) {
					throw new Error("You already submitted your vote.");
				}

				transaction.set(voteRef, {
					voterId: voteId,
					voterName: formData.hideName ? "Anonymous Voter" : formData.name,
					section: formData.section,
					selections: selectedCandidates,
					createdAt: serverTimestamp(),
				});
			});

			if (typeof window !== "undefined") {
				localStorage.removeItem(STEP_STORAGE_KEY);
			}

			setSubmittedVotes(selectedCandidates);
			setHasVoted(true);
		} catch (error) {
			alert(error instanceof Error ? error.message : "Unable to submit vote. Please try again.");
		} finally {
			setSubmitting(false);
		}
	}, [formData.hideName, formData.idNumber, formData.name, formData.section, selectedCandidates]);

	const validateForm = () => {
		const errors = {
			idNumber: "",
			section: "",
		};

		if (!formData.idNumber.trim()) {
			errors.idNumber = "ID Number is required";
		}

		if (!formData.section.trim()) {
			errors.section = "Section is required";
		}

		setFormErrors(errors);

		return !errors.idNumber && !errors.section;
	};

	const handleContinueToBallot = () => {
		if (!validateForm()) return;
		setStep("ballot");
		if (typeof window !== "undefined") {
			localStorage.setItem(STEP_STORAGE_KEY, "ballot");
		}
	};

	const handleAbstain = useCallback((position: string) => {
		setSelectedCandidates((prev) => ({
			...prev,
			[position]: "abstain",
		}));
	}, []);

	const handleLiveCandidateSelect = useCallback((position: string, candidateId: string) => {
		setSelectedCandidates((prev) => {
			if (isSelectNPosition(position)) {
				// Handle multi-select positions
				const current = prev[position];
				const selections = Array.isArray(current) ? current : [];

				// If candidate is already selected, deselect
				if (selections.includes(candidateId)) {
					const nextSelections = selections.filter((id) => id !== candidateId);
					if (nextSelections.length === 0) {
						const next = { ...prev };
						delete next[position];
						return next;
					}
					return {
						...prev,
						[position]: nextSelections,
					};
				}

				// If not yet 2 selected, add the candidate
				if (selections.length < 2) {
					return {
						...prev,
						[position]: [...selections, candidateId],
					};
				}

				// If already 2 selected, show alert
				alert(`You can only select 2 candidates for ${position}`);
				return prev;
			} else {
				// Handle single-select positions (existing behavior)
				return {
					...prev,
					[position]: candidateId,
				};
			}
		});
	}, []);

	const openCandidateDetails = useCallback((position: string, candidate: CandidateRecord) => {
		setActiveCandidateModal({ position, candidate });
	}, []);

	const closeCandidateDetails = useCallback(() => {
		setActiveCandidateModal(null);
	}, []);

	const selectFromCandidateModal = useCallback(() => {
		if (!activeCandidateModal) return;
		handleLiveCandidateSelect(activeCandidateModal.position, activeCandidateModal.candidate.id);
		setActiveCandidateModal(null);
	}, [activeCandidateModal, handleLiveCandidateSelect]);

	if (!isVotingOpen) {
		return (
			<div className="min-h-screen bg-[#FDFCFB] font-poppins pb-28 selection:bg-[#f05a28]/20">
				<Navbar />
				<div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6">
					<div className="w-full rounded-[2rem] border border-orange-100 bg-white p-8 text-center shadow-sm">
						<p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f05a28]">Voting Access</p>
						<h1 className="mt-3 text-3xl font-[900] tracking-tight text-gray-900">Voting is currently closed</h1>
						<p className="mt-3 text-sm font-semibold text-gray-600">
							Please wait until the election is opened by admin before proceeding to the candidate ballot.
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (hasVoted) {
		return (
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="min-h-screen bg-gradient-to-br from-white via-orange-50/30 to-white flex items-center justify-center p-6 overflow-hidden relative"
				>
					<motion.div
						initial={{ scale: 0.8, y: 20 }}
						animate={{ scale: 1, y: 0 }}
						className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] max-w-2xl w-full border border-orange-100 relative overflow-hidden max-h-[90vh] overflow-y-auto"
					>
						<div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.2, type: "spring" }}
							className="w-28 h-28 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"
						>
							<CheckCircle size={56} strokeWidth={2.5} />
						</motion.div>

						<h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tight uppercase italic text-center">
							Ballot Confirmed
						</h2>

						<p className="text-center text-gray-500 mb-8 font-semibold">Your vote has been securely recorded</p>

						<div className="bg-gray-50 rounded-2xl p-4 mb-8 flex flex-col gap-2">
							<p className="text-xs font-mono text-gray-400">TRANSACTION HASH</p>
							<p className="text-xs font-mono font-bold text-gray-700 truncate uppercase tracking-widest">
								CET-VOTE-2026-X89B-Q21Z-KLL9
							</p>
						</div>

						<div className="mb-8">
							<h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">Your Ballot Summary</h3>
							<div className="space-y-3">
								{POSITIONS.map((position) => {
									const vote = submittedVotes?.[position];
									let candidateNames: string | string[];

									if (vote === "abstain") {
										candidateNames = "ABSTAINED";
									} else if (isSelectNPosition(position) && Array.isArray(vote)) {
										// For select-2 positions, show both candidate names
										const names = vote
											.map((id) => liveCandidates.find((c) => c.id === id)?.name)
											.filter((n): n is string => Boolean(n));
										candidateNames = names.length > 0 ? names : ["NO SELECTIONS"];
									} else if (typeof vote === "string" && vote.length > 0) {
										// For regular positions
										const selectedCandidate = liveCandidates.find((c) => c.id === vote);
										candidateNames = selectedCandidate?.name || "SELECTION RECORDED";
									} else {
										candidateNames = "NO SELECTION";
									}

									return (
										<motion.div
											key={position}
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											className="p-4 rounded-2xl border border-green-100 bg-green-50/50 flex items-start justify-between gap-4"
										>
											<div className="flex-1 min-w-0">
												<p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{position}</p>
												{Array.isArray(candidateNames) ? (
													<div className="space-y-1">
														{candidateNames.map((name, idx) => (
															<p key={idx} className="text-sm font-black text-gray-900">
																✓ {name}
															</p>
														))}
													</div>
												) : (
													<p className="text-sm font-black text-gray-900">{candidateNames}</p>
												)}
											</div>
											<CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-1" />
										</motion.div>
									);
								})}
							</div>
						</div>

						<Link
							href="/vote"
							className="w-full bg-[#111] text-white px-8 py-5 rounded-2xl font-black hover:bg-[#f05a28] transition-all shadow-2xl uppercase tracking-tighter flex items-center justify-center gap-3"
						>
							Finish Session <ChevronRight size={20} />
						</Link>
					</motion.div>
				</motion.div>
			</AnimatePresence>
		);
	}

	return (
		<main className="min-h-screen bg-[#FDFCFB] font-poppins pb-32 selection:bg-[#f05a28]/20">
			<Navbar />

			<motion.div
				className="fixed top-0 left-0 right-0 h-1.5 bg-[#f05a28] z-[110] origin-left"
				style={{ scaleX }}
			/>

			{step === "ballot" ? (
				<>
					{/* STICKY BAR */}
					<div className="sticky top-0 z-[60] bg-white/90 backdrop-blur-2xl border-b border-gray-100 py-4 shadow-sm">
						<div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#f05a28] border border-gray-100 font-black italic">
									{Math.round(progress)}%
								</div>
								<div className="hidden sm:block">
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
										Progress
									</p>
									<p className="text-sm font-black text-gray-900">
										{Object.keys(selectedCandidates).length} of {POSITIONS.length} Casted
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									onClick={() => setShowSummary(!showSummary)}
									className="px-6 py-3 rounded-2xl bg-gray-50 text-gray-900 text-xs font-black uppercase tracking-tight hover:bg-gray-100 transition-all flex items-center gap-2"
								>
									<LayoutList size={16} /> Summary
								</button>

								<button
									onClick={handleVoteSubmit}
									className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 shadow-lg ${
										progress === 100
											? "bg-[#f05a28] text-white shadow-[#f05a28]/20"
											: "bg-gray-200 text-gray-400 cursor-not-allowed"
									}`}
								>
									Cast Ballot <Send size={16} />
								</button>
							</div>
						</div>
						<div className="max-w-6xl mx-auto px-6 mt-3">
							<div className="h-2 rounded-full bg-gray-100 overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-[#f05a28] to-orange-400 transition-all duration-500"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>
					</div>

					{/* VOTER BADGE */}
					<div className="max-w-6xl mx-auto px-6 pt-10">
						<div className="rounded-[2rem] border border-gray-100 bg-white shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
							<div className="flex items-center gap-4">
								<div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#f05a28] flex items-center justify-center">
									<UserCircle2 size={28} />
								</div>
								<div>
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
										Verified Voter
									</p>
									<p className="text-lg font-black text-gray-900 uppercase tracking-tight">
										{formData.hideName ? "Anonymous Voter" : formData.name}
									</p>
									<p className="text-sm text-gray-500 font-semibold">
										{formData.idNumber} • {formData.section}
									</p>
								</div>
							</div>

							<button
								onClick={() => {
									setStep("form");
									if (typeof window !== "undefined") {
										localStorage.setItem(STEP_STORAGE_KEY, "form");
									}
								}}
								className="px-6 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-xs font-black uppercase tracking-tight hover:bg-gray-100 transition-all"
							>
								Edit Voter Info
							</button>
						</div>
					</div>

					<div className="max-w-6xl mx-auto pt-20 px-6">
						{POSITIONS.map((pos, index) => (
							<motion.section
								key={pos}
								initial={{ opacity: 0, y: 50 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-100px" }}
								className="mb-32 relative"
							>
								<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
									<div className="flex items-center gap-6">
										<span className="text-7xl font-black text-gray-100 italic leading-none select-none">
											{String(index + 1).padStart(2, "0")}
										</span>
										<div>
											<h3 className="text-3xl font-[900] text-gray-900 uppercase tracking-tighter leading-none mb-2">
												{pos}
											</h3>
											<div className="flex items-center gap-3">
												<span className="h-0.5 w-8 bg-[#f05a28]" />
												<p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isPositionSelected(pos) ? "text-green-600" : "text-[#f05a28]"}`}>
													{(() => {
														if (isSelectNPosition(pos)) {
															const selection = selectedCandidates[pos];
															if (selection === "abstain") return "ABSTAINED";
															const count = Array.isArray(selection) ? selection.length : 0;
															return count > 0 ? `Selected ${count}/2` : "Required Selection (2)";
														}
														return selectedCandidates[pos] ? "Selection Captured" : "Required Selection";
													})()}
												</p>
											</div>
										</div>
									</div>

									<button
										onClick={() => handleAbstain(pos)}
										className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
											selectedCandidates[pos] === "abstain"
												? "bg-gray-900 text-white border-gray-900"
												: "border-gray-100 text-gray-400 hover:border-gray-200"
										}`}
									>
										<RefreshCcw size={14} /> Abstain for this position
									</button>
								</div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
									{liveCandidates
										.filter((candidate) => candidate.position === pos)
										.map((candidate) => {
											let isSelected = false;
											const selection = selectedCandidates[pos];
											if (isSelectNPosition(pos)) {
												isSelected = Array.isArray(selection) && selection.includes(candidate.id);
											} else {
												isSelected = selection === candidate.id;
											}

											return (
												<CandidateCard
													key={candidate.id}
													name={candidate.name}
													section={candidate.section || "TBA"}
													bio={candidate.platform || "Platform to be announced."}
													partylist={candidate.partylist}
													motto={candidate.motto}
													image={candidate.photoUrl}
													candidateId={candidate.id}
													isSelected={isSelected}
													onSelect={() => openCandidateDetails(pos, candidate)}
													onViewProfile={() => openCandidateDetails(pos, candidate)}
													onVoteNow={() => handleLiveCandidateSelect(pos, candidate.id)}
												/>
											);
										})}
								</div>
							</motion.section>
						))}
					</div>
				</>
			) : (
				<>
					<div className="max-w-6xl mx-auto px-6 pt-14">
						{step === "form" && (
							<motion.div
								initial={{ opacity: 0, y: 35 }}
								animate={{ opacity: 1, y: 0 }}
								className="max-w-4xl mx-auto"
							>
								<div className="rounded-[2.8rem] border border-gray-100 bg-white shadow-[0_20px_80px_-30px_rgba(0,0,0,0.18)] overflow-hidden">
									<div className="h-2 w-full bg-[#f05a28]" />
									<div className="p-7 md:p-10">
										<div className="flex items-center gap-4 mb-8">
											<div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#f05a28] flex items-center justify-center">
												<UserCircle2 size={32} />
											</div>
											<div>
												<p className="text-[10px] font-black text-[#f05a28] uppercase tracking-[0.3em] mb-2">
													Voter Information
												</p>
												<h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter italic">
													Fill Up the Form
												</h2>
											</div>
										</div>

										<div className="mb-8 rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 md:p-6 shadow-sm">
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
												<div>
													<p className="text-[10px] font-black text-[#f05a28] uppercase tracking-[0.3em] mb-2">
														Logged-in voter
													</p>
													<p className="text-sm text-gray-500 leading-6 max-w-2xl">
														Your account details are loaded from your current session. You can hide your name for privacy, but your ID stays tied to the verified voter record.
													</p>
												</div>

												<button
													type="button"
													onClick={() =>
														setFormData((prev) => ({
															...prev,
															hideName: !prev.hideName,
														}))
													}
													className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-xs font-black uppercase tracking-tight hover:border-[#f05a28]/30 hover:text-[#f05a28] transition-all shadow-sm"
												>
													{formData.hideName ? <Eye size={16} /> : <EyeOff size={16} />}
													{formData.hideName ? "Show Name" : "Hide Name"}
												</button>
											</div>

											<div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="rounded-[1.7rem] border border-gray-100 bg-white px-5 py-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.25)]">
													<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">
														Name
													</p>
													<p className="text-lg font-black text-gray-900 uppercase tracking-tight">
														{isLoadingIdentity ? "Loading..." : formData.hideName ? "Anonymous Voter" : formData.name}
													</p>
													<p className="mt-1 text-sm text-gray-500 font-medium">
														Prefilled from your login session
													</p>
												</div>

												<div className="rounded-[1.7rem] border border-gray-100 bg-white px-5 py-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.25)]">
													<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">
														ID Number
													</p>
													<p className="text-lg font-black text-gray-900 uppercase tracking-tight">
														{isLoadingIdentity ? "Loading..." : formData.idNumber}
													</p>
													<p className="mt-1 text-sm text-gray-500 font-medium">
														Linked to the authenticated session
													</p>
												</div>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-6">
											<div className="rounded-[1.8rem] border-2 transition-all bg-white p-5 md:p-6 shadow-sm"
												style={{borderColor: formErrors.section ? '#ef4444' : '#e5e7eb'}}>
												<label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.25em] mb-3">
													Section <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													value={formData.section}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															section: e.target.value,
														}))
													}
													className="w-full h-16 px-5 rounded-[1.4rem] border-2 bg-white outline-none text-gray-900 font-semibold transition"
													style={{borderColor: formErrors.section ? '#fecaca' : '#e5e7eb'}}
													onFocus={(e) => e.target.style.borderColor = '#f05a28'}
													onBlur={(e) => e.target.style.borderColor = formErrors.section ? '#fecaca' : '#e5e7eb'}
													placeholder="Enter your section / block"
												/>
												{formErrors.section && (
													<motion.p 
														initial={{ opacity: 0, y: -5 }}
														animate={{ opacity: 1, y: 0 }}
														className="mt-3 text-sm text-red-600 font-black flex items-center gap-2"
													>
														<AlertCircle size={16} /> {formErrors.section}
													</motion.p>
												)}
											</div>
										</div>

										<div className="mt-8 rounded-[1.8rem] border border-gray-100 bg-gray-50 p-5">
											<div className="flex items-start gap-4">
												<div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 text-[#f05a28] flex items-center justify-center shrink-0">
													<ShieldCheck size={22} />
												</div>
												<div>
													<p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] mb-2">
														Confirmation
													</p>
													<p className="text-sm text-gray-600 leading-7">
														By continuing, you confirm that the voter information provided is
														correct and will be used for CET election verification before showing
														the candidate list.
													</p>
												</div>
											</div>
										</div>

										<div className="mt-8 flex justify-end">
											<button
												onClick={handleContinueToBallot}
												disabled={isLoadingIdentity || !formData.idNumber}
												className="px-8 py-4 rounded-2xl bg-[#111] text-white font-black uppercase tracking-tight hover:bg-[#f05a28] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Next <ArrowRight size={18} />
											</button>
										</div>
									</div>
								</div>
							</motion.div>
						)}
					</div>
				</>
			)}

			<AnimatePresence>
				{activeCandidateModal && step === "ballot" && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={closeCandidateDetails}
							className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
						/>

						<motion.div
							initial={{ opacity: 0, y: 30, scale: 0.96 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 30, scale: 0.96 }}
							className="fixed inset-0 z-[140] flex items-start justify-center p-4 md:items-center"
						>
							<div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl md:max-w-2xl">
								<div className="h-2 w-full bg-gradient-to-r from-[#f05a28] via-orange-400 to-[#f7a35b]" />
								<div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4 md:px-8">
										<div>
											<p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#f05a28]">
												Candidate Details
											</p>
											<h4 className="text-3xl font-black tracking-tight text-gray-900 italic">
												{activeCandidateModal.candidate.name}
											</h4>
											<p className="mt-2 inline-flex rounded-full border border-[#ffd9c6] bg-[#fff4ec] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f05a28]">
												{activeCandidateModal.candidate.section || "TBA"}
											</p>
										</div>
										<button
											onClick={closeCandidateDetails}
											className="p-2 rounded-full hover:bg-gray-100 transition-all"
										>
											<X size={20} />
										</button>
									</div>

								<div className="overflow-y-auto p-6 md:p-8">

									<div className="mb-5 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-3">
										<motion.div 
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="relative h-72 w-full overflow-hidden rounded-xl bg-white flex items-center justify-center"
										>
											{(() => {
												const photoSrc = activeCandidateModal?.candidate.photoUrl;
												return photoSrc ? (
													<motion.div
														whileHover={{ scale: 1.04 }}
														className="relative w-full h-full"
													>
														<Image
															src={photoSrc}
															alt={activeCandidateModal?.candidate.name || 'Candidate'}
															fill
															className="object-cover"
														/>
														<div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
													</motion.div>
												) : (
													<motion.div 
														animate={{ scale: [1, 1.02, 1] }}
														transition={{ duration: 2, repeat: Infinity }}
														className="flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100"
													>
														<User size={80} className="text-orange-200" />
													</motion.div>
												);
											})()}
										</motion.div>
									</div>

									<div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
										<div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f3] px-4 py-3">
											<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Position</p>
											<p className="mt-1 text-sm font-black uppercase text-gray-900">
												{activeCandidateModal.candidate.position}
											</p>
										</div>
										<div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f3] px-4 py-3">
											<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Section</p>
											<p className="mt-1 text-sm font-black uppercase text-gray-900">
												{activeCandidateModal.candidate.section || "TBA"}
											</p>
										</div>
									</div>

									<div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
											<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Partylist / Group</p>
											<p className="mt-1 text-sm font-black uppercase text-gray-900">
												{activeCandidateModal.candidate.partylist || "Independent"}
											</p>
										</div>
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
											<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Motto / Slogan</p>
											<p className="mt-1 text-sm font-semibold italic text-gray-700">
												{activeCandidateModal.candidate.motto ? `"${activeCandidateModal.candidate.motto}"` : "No slogan provided."}
											</p>
										</div>
									</div>

									<div className="space-y-3 mb-6">
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
											<p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Biography / Background</p>
											<p className="text-sm leading-relaxed text-gray-600">{activeCandidateModal.candidate.biography || "No biography provided yet."}</p>
										</div>
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
											<p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Achievements</p>
											<p className="text-sm leading-relaxed text-gray-600">{activeCandidateModal.candidate.achievements || "No achievements listed yet."}</p>
										</div>
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
											<p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Experience / Leadership Roles</p>
											<p className="text-sm leading-relaxed text-gray-600">{activeCandidateModal.candidate.experience || "No experience listed yet."}</p>
										</div>
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
											<p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Goals If Elected</p>
											<p className="text-sm leading-relaxed text-gray-600">{activeCandidateModal.candidate.goals || "No goals provided yet."}</p>
										</div>
										<div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
											<p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Social Links</p>
											<p className="text-sm leading-relaxed text-gray-600">{activeCandidateModal.candidate.socialLinks || "No social links provided."}</p>
										</div>
									</div>

									<div className="flex gap-3">
										<button
											onClick={closeCandidateDetails}
											className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 font-black uppercase text-xs tracking-wide hover:bg-gray-200 transition-all"
										>
											Close
										</button>
										<button
											onClick={selectFromCandidateModal}
											className="flex-1 h-12 rounded-xl bg-[#f05a28] text-white font-black uppercase text-xs tracking-wide hover:bg-orange-600 transition-all"
										>
											Select Candidate
										</button>
									</div>
								</div>
							</div>
						</motion.div>
					</>
				)}

				{showSummary && step === "ballot" && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setShowSummary(false)}
							className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]"
						/>
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[130] shadow-2xl p-8 overflow-y-auto"
						>
							<div className="flex items-center justify-between mb-10">
								<h4 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">
									Ballot Summary
								</h4>
								<button
									onClick={() => setShowSummary(false)}
									className="p-2 hover:bg-gray-50 rounded-full"
								>
									<X size={24} />
								</button>
							</div>

							<div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
								<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">
									Voter
								</p>
								<p className="text-sm font-black text-gray-900 uppercase tracking-tight">
									{formData.hideName ? "Anonymous Voter" : formData.name}
								</p>
								<p className="text-sm text-gray-500 font-medium">
									{formData.idNumber} • {formData.section}
								</p>
							</div>

							<div className="space-y-4">
								{POSITIONS.map((pos) => {
									const voteId = selectedCandidates[pos];
						const selectedCandidate = typeof voteId === "string" ? liveCandidates.find(c => c.id === voteId) : undefined;
						let displayName: string | string[];

						if (voteId === "abstain") {
							displayName = "ABSTAINED";
						} else if (Array.isArray(voteId)) {
							const names = voteId
								.map((id) => liveCandidates.find((c) => c.id === id)?.name)
								.filter(Boolean);
							displayName = names.length > 0 ? names.join(" & ") : voteId.length > 0 ? "SELECTION RECORDED" : "PENDING";
						} else {
							displayName = selectedCandidate?.name || (voteId ? "SELECTION RECORDED" : "PENDING");
						}
									return (
										<motion.div
											key={pos}
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											className={`p-4 rounded-2xl border-2 transition-all ${
												voteId 
													? "border-green-100 bg-green-50/50" 
													: "border-red-100 bg-red-50/30"
											}`}
										>
											<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
												{pos}
											</p>
											<p className={`text-sm font-black uppercase tracking-tight truncate ${
												voteId 
													? "text-gray-900" 
													: "text-red-400"
											}`}>
												{displayName}
											</p>
										</motion.div>
									);
								})}
							</div>
						</motion.div>
					</>
				)}

				{isConfirming && step === "ballot" && (
					<div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 bg-black/80 backdrop-blur-xl"
						/>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 overflow-hidden"
						>
							<div className="absolute top-0 left-0 w-full h-2 bg-[#f05a28]" />
							<div className="text-center">
								<div className="w-20 h-20 bg-orange-50 text-[#f05a28] rounded-3xl flex items-center justify-center mx-auto mb-6">
									<Fingerprint size={40} />
								</div>

								<h3 className="text-3xl font-black text-gray-900 italic uppercase mb-4">
									Confirm Selection
								</h3>

								<p className="text-gray-500 font-medium mb-5">
									By confirming, you verify that these choices are your own. This action is
									encrypted and irreversible.
								</p>

								<div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 mb-8 text-left">
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">
										Verified Voter
									</p>
									<p className="text-sm font-black text-gray-900 uppercase tracking-tight">
										{formData.hideName ? "Anonymous Voter" : formData.name}
									</p>
									<p className="text-sm text-gray-500 font-medium">
										{formData.idNumber} • {formData.section}
									</p>
								</div>

								<div className="flex flex-col gap-4">
									<button
										disabled={submitting}
										onClick={finalSubmit}
										className="w-full bg-[#111] text-white h-16 rounded-2xl font-black uppercase tracking-tighter hover:bg-[#f05a28] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
									>
										{submitting ? (
											<RefreshCcw className="animate-spin" />
										) : (
											<>
												<Lock size={18} /> Cast Secure Vote
											</>
										)}
									</button>

									<button
										onClick={() => setIsConfirming(false)}
										className="w-full h-16 rounded-2xl font-black uppercase tracking-tighter text-gray-400 hover:text-gray-900 transition-all"
									>
										Cancel
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</main>
	);
}
