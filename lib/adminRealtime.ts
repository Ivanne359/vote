import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ELECTION_POSITIONS = [
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
] as const;

export type ElectionPosition = (typeof ELECTION_POSITIONS)[number];

export interface CandidateRecord {
  id: string;
  name: string;
  position: string;
  section?: string;
  partylist?: string;
  courseYearDepartment?: string;
  motto?: string;
  platform?: string;
  biography?: string;
  achievements?: string;
  experience?: string;
  goals?: string;
  socialLinks?: string;
  photoUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SystemNotification {
  id: string;
  title: string;
  description: string;
  kind: "election" | "votes" | "candidates";
  actionHref?: string;
  actionLabel?: string;
  createdAt?: unknown;
}

export interface ElectionSettings {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  lastReset?: string;
  updatedAt?: unknown;
}

export interface VoteRecord {
  id: string;
  voterId: string;
  voterName: string;
  section: string;
  selections: Record<string, string | string[]>;
  createdAt?: { toDate?: () => Date } | Date | unknown;
}

export interface LiveAnalytics {
  totalVoters: number;
  totalVotes: number;
  turnoutPercentage: number;
  votesByPosition: Record<string, number>;
  activeSections: Record<string, number>;
  candidateCount: number;
  candidateVotes: Record<string, number>;
  recentVotes: VoteRecord[];
}

export const parseElectionDateTime = (date?: string, time?: string): Date | null => {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveElectionWindow = (
  startDate?: string,
  startTime?: string,
  endDate?: string,
  endTime?: string,
): { start: Date | null; end: Date | null; isOvernight: boolean } => {
  const start = parseElectionDateTime(startDate, startTime);
  const rawEnd = parseElectionDateTime(endDate, endTime);

  if (!start || !rawEnd) {
    return { start, end: rawEnd, isOvernight: false };
  }

  if (rawEnd > start) {
    return { start, end: rawEnd, isOvernight: false };
  }

  const overnightEnd = new Date(rawEnd);
  overnightEnd.setDate(overnightEnd.getDate() + 1);
  return { start, end: overnightEnd, isOvernight: true };
};

const defaultElectionSettings = (): ElectionSettings => {
  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    isActive: false,
  };
};

export const subscribeElectionSettings = (
  onData: (settings: ElectionSettings) => void,
): Unsubscribe => {
  if (!db) {
    onData(defaultElectionSettings());
    return () => undefined;
  }

  const settingsRef = doc(db, "adminConfig", "election");

  return onSnapshot(settingsRef, async (snapshot) => {
    if (!snapshot.exists()) {
      const defaults = defaultElectionSettings();
      await setDoc(settingsRef, {
        ...defaults,
        updatedAt: serverTimestamp(),
      });
      onData(defaults);
      return;
    }

    const data = snapshot.data() as Partial<ElectionSettings>;
    onData({
      ...defaultElectionSettings(),
      ...data,
    });
  });
};

export const saveElectionSettings = async (
  settings: Partial<ElectionSettings>,
): Promise<void> => {
  if (!db) throw new Error("Firebase is not configured.");

  const settingsRef = doc(db, "adminConfig", "election");
  await setDoc(
    settingsRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const setVotingActive = async (isActive: boolean): Promise<void> => {
  if (!db) throw new Error("Firebase is not configured.");

  const settingsRef = doc(db, "adminConfig", "election");
  await setDoc(
    settingsRef,
    {
      isActive,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const resetElectionVotes = async (): Promise<void> => {
  if (!db) throw new Error("Firebase is not configured.");

  const votesRef = collection(db, "votes");
  const votesSnap = await getDocs(votesRef);
  const batch = writeBatch(db);

  votesSnap.docs.forEach((voteDoc) => {
    batch.delete(voteDoc.ref);
  });

  await batch.commit();

  await saveElectionSettings({
    isActive: false,
    lastReset: new Date().toISOString(),
  });
};

export const subscribeCandidates = (
  onData: (candidates: CandidateRecord[]) => void,
): Unsubscribe => {
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const candidatesQuery = query(collection(db, "candidates"));

  return onSnapshot(candidatesQuery, (snapshot) => {
    const data: CandidateRecord[] = snapshot.docs.map((candidateDoc) => {
      const docData = candidateDoc.data();
      return {
        id: candidateDoc.id,
        name: String(docData.name ?? ""),
        position: String(docData.position ?? ""),
        section: docData.section ? String(docData.section) : undefined,
        partylist: docData.partylist ? String(docData.partylist) : undefined,
        courseYearDepartment: docData.courseYearDepartment ? String(docData.courseYearDepartment) : undefined,
        motto: docData.motto ? String(docData.motto) : undefined,
        platform: docData.platform ? String(docData.platform) : undefined,
        biography: docData.biography ? String(docData.biography) : undefined,
        achievements: docData.achievements ? String(docData.achievements) : undefined,
        experience: docData.experience ? String(docData.experience) : undefined,
        goals: docData.goals ? String(docData.goals) : undefined,
        socialLinks: docData.socialLinks ? String(docData.socialLinks) : undefined,
        photoUrl: docData.photoUrl ? String(docData.photoUrl) : undefined,
        createdAt: docData.createdAt,
        updatedAt: docData.updatedAt,
      };
    });

    data.sort((a, b) => a.name.localeCompare(b.name));
    onData(data);
  });
};

export const upsertCandidate = async (
  candidate: Omit<CandidateRecord, "id" | "createdAt" | "updatedAt">,
  id?: string,
): Promise<string> => {
  if (!db) throw new Error("Firebase is not configured.");

  const candidateRef = id
    ? doc(db, "candidates", id)
    : doc(collection(db, "candidates"));

  const payload = {
    ...candidate,
    ...(id ? {} : { createdAt: serverTimestamp() }),
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    candidateRef,
    payload,
    { merge: true },
  );

  return candidateRef.id;
};

export const removeCandidate = async (id: string): Promise<void> => {
  if (!db) throw new Error("Firebase is not configured.");

  await deleteDoc(doc(db, "candidates", id));
};

export const pushSystemNotification = async (
  notification: Omit<SystemNotification, "id" | "createdAt">,
): Promise<string> => {
  if (!db) throw new Error("Firebase is not configured.");

  const notificationRef = await addDoc(collection(db, "systemNotifications"), {
    ...notification,
    createdAt: serverTimestamp(),
  });

  return notificationRef.id;
};

export const subscribeSystemNotifications = (
  onData: (notifications: SystemNotification[]) => void,
): Unsubscribe => {
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const notificationsQuery = query(
    collection(db, "systemNotifications"),
    orderBy("createdAt", "desc"),
    limit(8),
  );

  return onSnapshot(notificationsQuery, (snapshot) => {
    const data: SystemNotification[] = snapshot.docs.map((notificationDoc) => {
      const docData = notificationDoc.data();
      return {
        id: notificationDoc.id,
        title: String(docData.title ?? "System alert"),
        description: String(docData.description ?? ""),
        kind: (docData.kind as SystemNotification["kind"]) || "election",
        actionHref: docData.actionHref ? String(docData.actionHref) : undefined,
        actionLabel: docData.actionLabel ? String(docData.actionLabel) : undefined,
        createdAt: docData.createdAt,
      };
    });

    onData(data);
  });
};

const isDateInRange = (date: Date, range: "today" | "week" | "month"): boolean => {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    start.setDate(now.getDate() - 7);
  } else {
    start.setMonth(now.getMonth() - 1);
  }

  return date >= start && date <= now;
};

const normalizeCreatedAt = (value: VoteRecord["createdAt"]): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const asTimestamp = value as { toDate?: () => Date };
  if (asTimestamp.toDate) return asTimestamp.toDate();

  return null;
};

export const subscribeLiveAnalytics = (
  range: "today" | "week" | "month",
  onData: (data: LiveAnalytics) => void,
): Unsubscribe => {
  if (!db) {
    onData({
      totalVoters: 0,
      totalVotes: 0,
      turnoutPercentage: 0,
      votesByPosition: Object.fromEntries(ELECTION_POSITIONS.map((pos) => [pos, 0])),
      activeSections: {},
      candidateCount: 0,
      candidateVotes: {},
      recentVotes: [],
    });
    return () => undefined;
  }

  let usersCount = 0;
  let votes: VoteRecord[] = [];
  let candidateCount = 0;

  const emit = () => {
    const votesInRange = votes.filter((vote) => {
      const createdAt = normalizeCreatedAt(vote.createdAt);
      if (!createdAt) return true;
      return isDateInRange(createdAt, range);
    });

    const votesByPosition: Record<string, number> = Object.fromEntries(
      ELECTION_POSITIONS.map((pos) => [pos, 0]),
    );

    const activeSections: Record<string, number> = {};
    const candidateVotes: Record<string, number> = {};

    votesInRange.forEach((vote) => {
      Object.entries(vote.selections || {}).forEach(([position, choice]) => {
        if (!choice || choice === "abstain") return;

        // Increment position vote count (for both single and multi-select positions)
        votesByPosition[position] = (votesByPosition[position] ?? 0) + 1;

        // Handle both single selections (string) and multi-select (array)
        if (Array.isArray(choice)) {
          // Multi-select position - count each candidate separately
          choice.forEach((candidateId) => {
            if (candidateId) {
              candidateVotes[candidateId] = (candidateVotes[candidateId] ?? 0) + 1;
            }
          });
        } else {
          // Single-select position
          candidateVotes[choice] = (candidateVotes[choice] ?? 0) + 1;
        }
      });

      const key = vote.section || "Unspecified";
      activeSections[key] = (activeSections[key] ?? 0) + 1;
    });

    const totalVotes = votesInRange.length;
    const turnoutPercentage = usersCount > 0 ? (totalVotes / usersCount) * 100 : 0;

    onData({
      totalVoters: usersCount,
      totalVotes,
      turnoutPercentage,
      votesByPosition,
      activeSections,
      candidateCount,
      candidateVotes,
      recentVotes: votesInRange
        .slice()
        .sort((a, b) => {
          const aDate = normalizeCreatedAt(a.createdAt)?.getTime() ?? 0;
          const bDate = normalizeCreatedAt(b.createdAt)?.getTime() ?? 0;
          return bDate - aDate;
        })
        .slice(0, 8),
    });
  };

  const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
    usersCount = snapshot.size;
    emit();
  });

  const unsubVotes = onSnapshot(collection(db, "votes"), (snapshot) => {
    votes = snapshot.docs.map((voteDoc) => {
      const raw = voteDoc.data();
      return {
        id: voteDoc.id,
        voterId: String(raw.voterId ?? voteDoc.id),
        voterName: String(raw.voterName ?? "Anonymous Voter"),
        section: String(raw.section ?? "Unspecified"),
        selections: (raw.selections as Record<string, string | string[]>) ?? {},
        createdAt: raw.createdAt,
      };
    });
    emit();
  });

  const unsubCandidates = onSnapshot(collection(db, "candidates"), (snapshot) => {
    candidateCount = snapshot.size;
    emit();
  });

  return () => {
    unsubUsers();
    unsubVotes();
    unsubCandidates();
  };
};
