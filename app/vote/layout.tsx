"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const resolveUserRecord = async () => {
    if (!db || !user) {
      return null;
    }

    const directSnapshot = await getDoc(doc(db, "users", user.uid));
    if (directSnapshot.exists()) {
      return directSnapshot;
    }

    if (!user.providerData.some((provider) => provider.providerId === "google.com")) {
      return null;
    }

    const usersRef = collection(db, "users");
    const googleUidSnapshot = await getDocs(
      query(usersRef, where("googleUid", "==", user.uid), limit(1))
    );

    if (!googleUidSnapshot.empty) {
      return googleUidSnapshot.docs[0];
    }

    const normalizedEmail = user.email?.toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    const googleEmailSnapshot = await getDocs(
      query(usersRef, where("googleEmail", "==", normalizedEmail), limit(1))
    );

    if (!googleEmailSnapshot.empty) {
      return googleEmailSnapshot.docs[0];
    }

    const emailSnapshot = await getDocs(
      query(usersRef, where("email", "==", normalizedEmail), limit(1))
    );

    if (!emailSnapshot.empty) {
      return emailSnapshot.docs[0];
    }

    return null;
  };

  useEffect(() => {
    // Ensure we don't render differing content between server and client
    // to avoid hydration mismatches. Only render after client mount.
    setMounted(true);

    const validateAccess = async () => {
      if (loading) {
        return;
      }

      if (!user) {
        setCanAccess(false);
        setAccessChecked(true);
        router.push("/vote/login");
        return;
      }

      const isGoogleUser = user.providerData.some((provider) => provider.providerId === "google.com");
      if (!isGoogleUser) {
        setCanAccess(true);
        setAccessChecked(true);
        return;
      }

      if (!db) {
        setCanAccess(false);
        setAccessChecked(true);
        router.push("/vote/login");
        return;
      }

      const snapshot = await resolveUserRecord();
      const data = snapshot && snapshot.exists() ? snapshot.data() : null;
      const studentId = String(data?.studentId || "");
      const verifiedAt = String(data?.googleVerifiedAt || "");
      const isVerified = Boolean(verifiedAt) && /^\d{8}$/.test(studentId);

      setCanAccess(isVerified);
      setAccessChecked(true);

      if (!isVerified) {
        router.push("/");
      }
    };

    void validateAccess();
  }, [user, loading, router]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !accessChecked || !canAccess) {
    return null;
  }

  return <>{children}</>;
}
