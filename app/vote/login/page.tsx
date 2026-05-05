"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import VerificationCodeModal from "@/app/components/VerificationCodeModal";
import { Loader2, ShieldCheck, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";

export default function VoteLoginPage() {
  const { user, loading, signInWithGoogle, sendVerificationCode, logout } = useAuth();
  const router = useRouter();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showGoogleIdWizard, setShowGoogleIdWizard] = useState(false);
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState("");
  const [pendingGoogleUid, setPendingGoogleUid] = useState("");
  const [pendingGoogleName, setPendingGoogleName] = useState("");
  const [pendingGooglePic, setPendingGooglePic] = useState("");
  const [googleIdNumber, setGoogleIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const saveGoogleSession = (payload: {
    email: string;
    fullName: string;
    studentId: string;
    profilePic?: string;
  }) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("voterName", payload.fullName);
    localStorage.setItem("voterId", payload.studentId);
    localStorage.setItem("voterEmail", payload.email.toLowerCase());
    if (payload.profilePic) {
      localStorage.setItem("voterPic", payload.profilePic);
    }
  };

  const handleGoogleIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 8) {
      setGoogleIdNumber(value);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    clearMessages();

    try {
      const signedEmail = await signInWithGoogle(false);
      if (signedEmail === null) {
        // Mobile redirect flow started; wait for the next auth state change after redirect.
        return;
      }

      const currentUser = auth?.currentUser;
      if (!signedEmail || !currentUser?.uid) {
        throw new Error("Failed to get email from Google account.");
      }

      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const normalizedEmail = signedEmail.toLowerCase();
      const usersRef = collection(db, "users");
      const userByEmailQuery = query(usersRef, where("email", "==", normalizedEmail), limit(1));
      const userSnapshot = await getDocs(userByEmailQuery);

      const resolvedName = currentUser.displayName || "Voter";
      const resolvedPic = currentUser.photoURL || "";

      if (!userSnapshot.empty) {
        const existingData = userSnapshot.docs[0].data();
        const existingDocId = userSnapshot.docs[0].id;
        const savedStudentId = String(existingData.studentId || "");
        const savedName = String(existingData.fullName || existingData.name || resolvedName);
        const savedPic = String(existingData.profilePic || resolvedPic || "");

        if (/^\d{8}$/.test(savedStudentId)) {
          await setDoc(
            doc(db, "users", existingDocId),
            {
              provider: "google",
              email: normalizedEmail,
              fullName: savedName,
              profilePic: savedPic || null,
              googleVerifiedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          saveGoogleSession({
            email: normalizedEmail,
            fullName: savedName,
            studentId: savedStudentId,
            profilePic: savedPic,
          });

          router.push("/vote/candidate");
          return;
        }
      }

      await sendVerificationCode(normalizedEmail);

      setPendingGoogleEmail(normalizedEmail);
      setPendingGoogleUid(currentUser.uid);
      setPendingGoogleName(resolvedName);
      setPendingGooglePic(resolvedPic);
      setShowVerificationModal(true);
    } catch (err) {
      console.error("Google sign-in error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleVerificationComplete = async () => {
    try {
      if (!auth?.currentUser) {
        throw new Error("Firebase is not configured.");
      }

      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const normalizedEmail = pendingGoogleEmail.toLowerCase();
      const usersRef = collection(db, "users");
      const userByEmailQuery = query(usersRef, where("email", "==", normalizedEmail), limit(1));
      const userSnapshot = await getDocs(userByEmailQuery);

      let docId = auth.currentUser.uid;
      let resolvedName = pendingGoogleName || auth.currentUser.displayName || "Voter";
      let resolvedPic = pendingGooglePic || auth.currentUser.photoURL || "";
      let resolvedStudentId = "";

      if (userSnapshot.empty) {
        await setDoc(
          doc(db, "users", docId),
          {
            uid: docId,
            email: normalizedEmail,
            fullName: resolvedName,
            profilePic: resolvedPic || null,
            createdAt: new Date().toISOString(),
            provider: "google",
            googleVerifiedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        const existingDoc = userSnapshot.docs[0];
        const existingData = existingDoc.data();
        docId = existingDoc.id;
        resolvedName = (existingData.fullName || existingData.name || resolvedName) as string;
        resolvedPic = (existingData.profilePic || resolvedPic || "") as string;
        resolvedStudentId = String(existingData.studentId || "");

        if (!existingData.uid) {
          await setDoc(doc(db, "users", docId), { uid: docId }, { merge: true });
        }
      }

      setShowVerificationModal(false);
      setPendingGoogleUid(docId);
      setPendingGoogleName(resolvedName);
      setPendingGooglePic(resolvedPic);

      if (/^\d{8}$/.test(resolvedStudentId)) {
        saveGoogleSession({
          email: normalizedEmail,
          fullName: resolvedName,
          studentId: resolvedStudentId,
          profilePic: resolvedPic,
        });
        router.push("/vote/candidate");
        return;
      }

      setGoogleIdNumber("");
      setShowGoogleIdWizard(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to continue Google login";
      setError(errorMessage);
      setShowVerificationModal(false);
    }
  };

  const handleGoogleIdWizardSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (googleIdNumber.length !== 8) {
      setError("Student ID must be exactly 8 digits.");
      return;
    }

    try {
      if (!db || !pendingGoogleUid) {
        throw new Error("Missing Google account details.");
      }

      const usersRef = collection(db, "users");
      const studentIdQuery = query(usersRef, where("studentId", "==", googleIdNumber), limit(1));
      const existingStudentId = await getDocs(studentIdQuery);
      const takenByAnother = existingStudentId.docs.some((item) => item.id !== pendingGoogleUid);

      if (takenByAnother) {
        throw new Error("Student ID is already registered.");
      }

      const userDocRef = doc(db, "users", pendingGoogleUid);
      const userDocSnapshot = await getDoc(userDocRef);
      const currentData = userDocSnapshot.exists() ? userDocSnapshot.data() : {};

      const finalName = (currentData.fullName || currentData.name || pendingGoogleName || "Voter") as string;
      const finalPic = (currentData.profilePic || pendingGooglePic || "") as string;

      await setDoc(
        userDocRef,
        {
          uid: pendingGoogleUid,
          email: pendingGoogleEmail.toLowerCase(),
          fullName: finalName,
          profilePic: finalPic || null,
          studentId: googleIdNumber,
          provider: "google",
          googleVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      saveGoogleSession({
        email: pendingGoogleEmail,
        fullName: finalName,
        studentId: googleIdNumber,
        profilePic: finalPic,
      });

      setShowGoogleIdWizard(false);
      router.push("/vote/candidate");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save Student ID";
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (!loading && user && !showVerificationModal && !showGoogleIdWizard) {
      router.push("/vote/candidate");
    }
  }, [user, loading, router, showVerificationModal, showGoogleIdWizard]);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CETVOTE</h1>
          <p className="text-gray-600">Secure Student Election Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome to Voting</h2>
          <p className="text-gray-600 text-center mb-8">
            Sign in with your Google account to start voting securely.
          </p>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="inline-block mr-2 align-middle" size={16} />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Gmail Integration</p>
                <p className="text-sm text-blue-700">
                  Your Gmail address will be used for secure voting verification.
                </p>
              </div>
            </div>
          </div>

          <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              ✓ Your email is encrypted and secure<br />
              ✓ One vote per registered student<br />
              ✓ OAuth 2.0 secured authentication
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {showVerificationModal && pendingGoogleEmail && (
        <VerificationCodeModal
          email={pendingGoogleEmail}
          onVerified={handleGoogleVerificationComplete}
          onCancel={async () => {
            await logout();
            setShowVerificationModal(false);
            setPendingGoogleEmail("");
            setPendingGoogleUid("");
            setPendingGoogleName("");
            setPendingGooglePic("");
          }}
          onResend={async () => {
            if (!pendingGoogleEmail) return;
            await sendVerificationCode(pendingGoogleEmail);
          }}
        />
      )}

      {showGoogleIdWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Complete Your Profile</h3>
            <p className="mt-2 text-sm text-gray-600">
              Enter your 8-digit Student ID to finish Google sign-in.
            </p>

            <form onSubmit={handleGoogleIdWizardSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Student ID
                </label>
                <input
                  type="text"
                  value={googleIdNumber}
                  onChange={handleGoogleIdChange}
                  maxLength={8}
                  placeholder="598XXXXX"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-base text-gray-800 outline-none transition-all focus:border-[#f05a28] focus:ring-4 focus:ring-[#f05a28]/10"
                />
              </div>

              <button
                type="submit"
                disabled={googleIdNumber.length !== 8}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111] px-4 py-3 font-black uppercase tracking-wide text-white transition-colors hover:bg-[#f05a28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
