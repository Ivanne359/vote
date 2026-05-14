"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import PasswordSetupModal from "@/app/components/PasswordSetupModal";
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
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";

const GOOGLE_REDIRECT_PENDING_KEY = "google_sign_in_pending";

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
  const [googleRedirectPending, setGoogleRedirectPending] = useState(false);
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [pendingPasswordEmail, setPendingPasswordEmail] = useState("");
  const [pendingPasswordDocId, setPendingPasswordDocId] = useState("");
  const [passwordSetupRoute, setPasswordSetupRoute] = useState("/vote/candidate");
  const handledRedirectRef = useRef(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGoogleRedirectPending(sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === "1");
  }, []);

  const clearGoogleRedirectPending = () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    setGoogleRedirectPending(false);
  };

  const hasPasswordProvider = () =>
    auth?.currentUser?.providerData.some((provider) => provider.providerId === "password") ?? false;

  const openPasswordSetupModal = (email: string, docId: string, route: string) => {
    setPendingPasswordEmail(email.toLowerCase());
    setPendingPasswordDocId(docId);
    setPasswordSetupRoute(route);
    setShowPasswordSetupModal(true);
  };

  const finalizePasswordSetup = async (passwordValue: string) => {
    if (!auth?.currentUser) {
      throw new Error("Firebase Auth is not initialized.");
    }

    if (!db) {
      throw new Error("Firestore is not initialized.");
    }

    const accountEmail = pendingPasswordEmail || auth.currentUser.email || "";
    if (!accountEmail) {
      throw new Error("Missing account email.");
    }

    if (!hasPasswordProvider()) {
      const credential = EmailAuthProvider.credential(accountEmail, passwordValue);
      await linkWithCredential(auth.currentUser, credential);
    }

    const docId = pendingPasswordDocId || auth.currentUser.uid;
    await setDoc(
      doc(db, "users", docId),
      {
        uid: docId,
        email: accountEmail.toLowerCase(),
        passwordLinkedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    setShowPasswordSetupModal(false);
    setPendingPasswordEmail("");
    setPendingPasswordDocId("");
    clearGoogleRedirectPending();
    router.push(passwordSetupRoute);
  };

  const cancelPasswordSetup = async () => {
    setShowPasswordSetupModal(false);
    setPendingPasswordEmail("");
    setPendingPasswordDocId("");
    clearGoogleRedirectPending();
    if (auth?.currentUser) {
      await logout();
    }
  };

  const findGoogleLinkedUser = async (normalizedEmail: string) => {
    if (!db) {
      return null;
    }

    const usersRef = collection(db, "users");
    const byEmailSnapshot = await getDocs(
      query(usersRef, where("email", "==", normalizedEmail), limit(1))
    );

    if (!byEmailSnapshot.empty) {
      return byEmailSnapshot.docs[0];
    }

    const byGoogleEmailSnapshot = await getDocs(
      query(usersRef, where("googleEmail", "==", normalizedEmail), limit(1))
    );

    if (!byGoogleEmailSnapshot.empty) {
      return byGoogleEmailSnapshot.docs[0];
    }

    return null;
  };

  const completeGoogleSignInFlow = async (signedEmail: string) => {
    const currentUser = auth?.currentUser;

    if (!signedEmail || !currentUser?.uid) {
      throw new Error("Failed to get email from Google account.");
    }

    if (!db) {
      throw new Error("Firestore is not initialized.");
    }

    const normalizedEmail = signedEmail.toLowerCase();
    const userSnapshot = await findGoogleLinkedUser(normalizedEmail);

    const resolvedName = currentUser.displayName || "Voter";
    const resolvedPic = currentUser.photoURL || "";

    if (userSnapshot) {
      const existingData = userSnapshot.data();
      const existingDocId = userSnapshot.id;
      const savedStudentId = String(existingData.studentId || "");
      const savedName = String(existingData.fullName || existingData.name || resolvedName);
      const savedPic = String(existingData.profilePic || resolvedPic || "");

      if (/^\d{8}$/.test(savedStudentId)) {
        const accountEmail = String(existingData.email || normalizedEmail).toLowerCase();
        
        await setDoc(
          doc(db, "users", existingDocId),
          {
            uid: existingData.uid || existingDocId,
            email: accountEmail,
            googleEmail: normalizedEmail,
            googleUid: currentUser.uid,
            fullName: savedName,
            profilePic: savedPic || null,
            googleVerifiedAt: new Date().toISOString(),
            provider: "google",
          },
          { merge: true }
        );

        saveGoogleSession({
          email: accountEmail,
          fullName: savedName,
          studentId: savedStudentId,
          profilePic: savedPic,
        });

        if (!hasPasswordProvider()) {
          openPasswordSetupModal(accountEmail, existingDocId, "/vote/candidate");
          return;
        }

        clearGoogleRedirectPending();
        router.push("/vote/candidate");
        return;
      }
    }

    await sendVerificationCode(normalizedEmail);

    setPendingGoogleEmail(normalizedEmail);
    setPendingGoogleUid(currentUser.uid);
    setPendingGoogleName(resolvedName);
    setPendingGooglePic(resolvedPic);
    setShowGoogleIdWizard(false);
    setShowVerificationModal(true);
    clearGoogleRedirectPending();
  };

  useEffect(() => {
    if (
      handledRedirectRef.current ||
      !googleRedirectPending ||
      showVerificationModal ||
      showGoogleIdWizard ||
      showPasswordSetupModal ||
      !user?.email
    ) {
      return;
    }

    handledRedirectRef.current = true;
    void completeGoogleSignInFlow(user.email);
  }, [googleRedirectPending, showGoogleIdWizard, showVerificationModal, showPasswordSetupModal, user?.email]);

  const handleGoogleIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 8) {
      setGoogleIdNumber(value);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    clearMessages();
    handledRedirectRef.current = false;

    try {
      clearGoogleRedirectPending();
      const signedEmail = await signInWithGoogle(false);
      if (signedEmail === null) {
        return;
      }

      await completeGoogleSignInFlow(signedEmail);
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
      const userSnapshot = await findGoogleLinkedUser(normalizedEmail);

      let docId = auth.currentUser.uid;
      let resolvedName = pendingGoogleName || auth.currentUser.displayName || "Voter";
      let resolvedPic = pendingGooglePic || auth.currentUser.photoURL || "";
      let resolvedStudentId = "";

      if (!userSnapshot) {
        await setDoc(
          doc(db, "users", docId),
          {
            uid: docId,
            email: normalizedEmail,
            googleEmail: normalizedEmail,
            googleUid: auth.currentUser.uid,
            fullName: resolvedName,
            profilePic: resolvedPic || null,
            createdAt: new Date().toISOString(),
            provider: "google",
            googleVerifiedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        const existingData = userSnapshot.data();
        docId = userSnapshot.id;
        resolvedName = (existingData.fullName || existingData.name || resolvedName) as string;
        resolvedPic = (existingData.profilePic || resolvedPic || "") as string;
        resolvedStudentId = String(existingData.studentId || "");

        if (!existingData.uid) {
          await setDoc(doc(db, "users", docId), { uid: docId }, { merge: true });
        }

        await setDoc(
          doc(db, "users", docId),
          {
            googleEmail: normalizedEmail,
            googleUid: auth.currentUser.uid,
            provider: "google",
            googleVerifiedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setShowVerificationModal(false);
      setPendingGoogleUid(docId);
      setPendingGoogleName(resolvedName);
      setPendingGooglePic(resolvedPic);

      if (/^\d{8}$/.test(resolvedStudentId)) {
        saveGoogleSession({
          email: String((userSnapshot?.data()?.email || normalizedEmail)).toLowerCase(),
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
      const userDocRef = existingStudentId.empty
        ? doc(db, "users", pendingGoogleUid)
        : doc(db, "users", existingStudentId.docs[0].id);
      const userDocSnapshot = await getDoc(userDocRef);
      const currentData = userDocSnapshot.exists() ? userDocSnapshot.data() : {};

      const finalName = (currentData.fullName || currentData.name || pendingGoogleName || "Voter") as string;
      const finalPic = (currentData.profilePic || pendingGooglePic || "") as string;
      const finalEmail = String(currentData.email || pendingGoogleEmail).toLowerCase();

      await setDoc(
        userDocRef,
        {
          uid: currentData.uid || pendingGoogleUid,
          email: finalEmail,
          googleEmail: pendingGoogleEmail.toLowerCase(),
          googleUid: pendingGoogleUid,
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
        email: finalEmail,
        fullName: finalName,
        studentId: googleIdNumber,
        profilePic: finalPic,
      });

      if (!hasPasswordProvider()) {
        setShowGoogleIdWizard(false);
        openPasswordSetupModal(finalEmail, userDocRef.id, "/vote/candidate");
        return;
      }

      setShowGoogleIdWizard(false);
      clearGoogleRedirectPending();
      router.push("/vote/candidate");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save Student ID";
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (!loading && user && !showVerificationModal && !showGoogleIdWizard && !googleRedirectPending) {
      router.push("/vote/candidate");
    }
  }, [user, loading, router, showVerificationModal, showGoogleIdWizard, googleRedirectPending]);

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
            clearGoogleRedirectPending();
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

      {showPasswordSetupModal && pendingPasswordEmail && (
        <PasswordSetupModal
          email={pendingPasswordEmail}
          onSubmit={finalizePasswordSetup}
          onCancel={cancelPasswordSetup}
        />
      )}
    </div>
  );
}
