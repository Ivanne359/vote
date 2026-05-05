"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Loader2, ArrowRight, AlertCircle, Mail, IdCard, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Poppins } from 'next/font/google';

import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import VerificationCodeModal from '@/app/components/VerificationCodeModal';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  limit,
} from 'firebase/firestore';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900']
});

export default function AuthPage() {
  const router = useRouter();
  const { signInWithGoogle, sendVerificationCode } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [shake, setShake] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState("");
  const [pendingGoogleUid, setPendingGoogleUid] = useState("");
  const [pendingGoogleName, setPendingGoogleName] = useState("");
  const [pendingGooglePic, setPendingGooglePic] = useState("");
  const [showGoogleIdWizard, setShowGoogleIdWizard] = useState(false);
  const [googleIdNumber, setGoogleIdNumber] = useState("");
  const [googleIdLoading, setGoogleIdLoading] = useState(false);

  // Handle mobile redirect sign-in completion
  useEffect(() => {
    const handleRedirectSignIn = async () => {
      if (!auth?.currentUser || !db || googleLoading) return;

      try {
        const currentUser = auth.currentUser;
        const email = currentUser.email;
        if (!email) return;

        const normalizedEmail = email.toLowerCase();

        // Check if this is a new sign-in that needs verification
        const userByEmailQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
          limit(1)
        );

        const userSnapshot = await getDocs(userByEmailQuery);

        if (userSnapshot.empty) {
          // New user - trigger verification flow
          console.log("New user from redirect, sending verification code...");
          await sendVerificationCode(normalizedEmail);

          setPendingGoogleEmail(normalizedEmail);
          setPendingGoogleUid(currentUser.uid);
          setPendingGoogleName(currentUser.displayName || "Voter");
          setPendingGooglePic(currentUser.photoURL || "");
          setShowVerificationModal(true);
          setGoogleLoading(false);
        }
        // If user exists, they're already verified and should be redirected
        // This is handled by the existing auth state listener
      } catch (error) {
        console.error("Error handling redirect sign-in:", error);
        setGoogleLoading(false);
      }
    };

    // Only run if we have a current user and we're in login mode
    if (isLogin && auth?.currentUser && !showVerificationModal && !showGoogleIdWizard) {
      handleRedirectSignIn();
    }
  }, [auth?.currentUser, isLogin, showVerificationModal, showGoogleIdWizard, sendVerificationCode, googleLoading]);

  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordChecks = {
    length: password.length >= 8 && password.length <= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&]/.test(password),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const isStrongPassword = passwordScore === 5;
  const passwordStrength =
    passwordScore <= 2 ? "Weak" : passwordScore <= 4 ? "Medium" : "Strong";
  const passwordStrengthClass =
    passwordScore <= 2
      ? "text-red-500"
      : passwordScore <= 4
      ? "text-yellow-600"
      : "text-green-600";
  const passwordMeterWidth = `${(passwordScore / 5) * 100}%`;
  const passwordMeterClass =
    passwordScore <= 2
      ? "bg-red-500"
      : passwordScore <= 4
      ? "bg-yellow-500"
      : "bg-green-500";

  // Handle ID change (Numbers only & Max 8 digits)
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 8) {
      setStudentId(value);
    }
  };

  const triggerError = (message: string) => {
    setLoading(false);
    setError(message);
    setSuccessMsg("");
    setShake(true);
  };

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
    setShake(false);
  };

  const saveGoogleSession = (payload: {
    email: string;
    fullName: string;
    studentId: string;
    profilePic?: string;
  }) => {
    localStorage.setItem("voterName", payload.fullName);
    localStorage.setItem("voterId", payload.studentId);
    localStorage.setItem("voterEmail", payload.email.toLowerCase());
    if (payload.profilePic) {
      localStorage.setItem("voterPic", payload.profilePic);
    }
  };

  const handleGoogleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 8) {
      setGoogleIdNumber(value);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLogin) {
      return;
    }

    setGoogleLoading(true);
    try {
      clearMessages();
      console.log("Starting Google sign-in...");
      const signedUser = await signInWithGoogle(true);
      console.log("Signed user:", signedUser);

      // For mobile redirect flow, signedUser will be null
      // The verification flow will be handled by the useEffect above
      if (signedUser === null) {
        // Mobile redirect initiated, loading will be set to false by the useEffect
        return;
      }

      const signedEmail = signedUser.email;
      const signedUid = signedUser.uid;
      const signedDisplayName = signedUser.displayName || "Voter";
      const signedPhotoURL = signedUser.photoURL || "";

      console.log("Signed email:", signedEmail);

      if (!signedEmail || !signedUid) {
        throw new Error("Failed to get email from Google account.");
      }

      const normalizedEmail = signedEmail.toLowerCase();
      console.log("Normalized email:", normalizedEmail);

      if (!db) {
        throw new Error("Firebase is not configured.");
      }

      const userByEmailQuery = query(
        collection(db, "users"),
        where("email", "==", normalizedEmail),
        limit(1)
      );
      console.log("Querying Firestore for user...");
      const userSnapshot = await getDocs(userByEmailQuery);
      console.log("User snapshot empty?", userSnapshot.empty);

      if (!userSnapshot.empty) {
        console.log("Existing user found");
        const existingData = userSnapshot.docs[0].data();
        const savedStudentId = String(existingData.studentId || "");
        const savedName = String(existingData.fullName || existingData.name || signedDisplayName);
        const savedPic = String(existingData.profilePic || signedPhotoURL);

        if (/^\d{8}$/.test(savedStudentId)) {
          console.log("Valid student ID found, saving session...");
          saveGoogleSession({
            email: normalizedEmail,
            fullName: savedName,
            studentId: savedStudentId,
            profilePic: savedPic,
          });

          if (!existingData.provider) {
            await setDoc(
              doc(db, "users", userSnapshot.docs[0].id),
              {
                provider: "google",
                email: normalizedEmail,
                fullName: savedName,
                profilePic: savedPic || null,
                googleVerifiedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } else {
            await setDoc(
              doc(db, "users", userSnapshot.docs[0].id),
              { googleVerifiedAt: new Date().toISOString() },
              { merge: true }
            );
          }

          setGoogleLoading(false);
          console.log("Redirecting to /vote");
          router.push('/vote');
          return;
        }
      }

      console.log("New user, sending verification code...");
      try {
        await sendVerificationCode(normalizedEmail);
        console.log("Verification code sent successfully");
      } catch (sendError) {
        console.error("Failed to send verification code:", sendError);
        throw sendError;
      }

      setPendingGoogleEmail(normalizedEmail);
      setPendingGoogleUid(signedUid);
      setPendingGoogleName(signedDisplayName);
      setPendingGooglePic(signedPhotoURL);
      setShowVerificationModal(true);
      console.log("Verification modal should be shown");
    } catch (err) {
      console.error("Google sign-in error:", err);
      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError?.code === "auth/popup-closed-by-user") {
        setGoogleLoading(false);
        setError("Google sign-in was canceled.");
        return;
      }

      if (auth?.currentUser) {
        await signOut(auth);
      }
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      console.error("Triggering error:", errorMessage);
      triggerError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleVerificationComplete = async () => {
    try {
      if (!db || !auth?.currentUser) {
        throw new Error("Firebase is not configured.");
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
        await setDoc(doc(db, "users", docId), {
          uid: docId,
          email: normalizedEmail,
          fullName: resolvedName,
          profilePic: resolvedPic || null,
          createdAt: new Date().toISOString(),
          provider: "google",
          googleVerifiedAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        const existingDoc = userSnapshot.docs[0];
        const existingData = existingDoc.data();
        docId = existingDoc.id;
        resolvedName = (existingData.fullName || existingData.name || resolvedName) as string;
        resolvedPic = (existingData.profilePic || resolvedPic || "") as string;
        resolvedStudentId = (existingData.studentId || "") as string;

        if (!existingData.uid) {
          await setDoc(doc(db, "users", docId), { uid: docId }, { merge: true });
        }
      }

      setShowVerificationModal(false);
      setPendingGoogleUid(docId);
      setPendingGoogleName(resolvedName);
      setPendingGooglePic(resolvedPic);

      if (resolvedStudentId && resolvedStudentId.length === 8) {
        saveGoogleSession({
          email: normalizedEmail,
          fullName: resolvedName,
          studentId: resolvedStudentId,
          profilePic: resolvedPic,
        });
        router.push('/vote');
        return;
      }

      setGoogleIdNumber("");
      setShowGoogleIdWizard(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to continue Google login";
      triggerError(errorMessage);
      setShowVerificationModal(false);
    }
  };

  const handleGoogleIdWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (googleIdNumber.length !== 8) {
      setError("Student ID must be exactly 8 digits.");
      return;
    }

    try {
      setGoogleIdLoading(true);
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

      await setDoc(userDocRef, {
        uid: pendingGoogleUid,
        email: pendingGoogleEmail.toLowerCase(),
        fullName: finalName,
        profilePic: finalPic || null,
        studentId: googleIdNumber,
        provider: "google",
        googleVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      saveGoogleSession({
        email: pendingGoogleEmail,
        fullName: finalName,
        studentId: googleIdNumber,
        profilePic: finalPic,
      });

      setShowGoogleIdWizard(false);
      router.push('/vote');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save Student ID";
      setError(errorMessage);
    } finally {
      setGoogleIdLoading(false);
    }
  };

  const getFirebaseErrorMessage = (code?: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/weak-password":
        return "Password is too weak. Use 8-12 chars with uppercase, lowercase, number, and special (!@#$%^&).";
      case "auth/invalid-credential":
        return "Invalid Student ID or Password.";
      case "auth/user-not-found":
        return "No account found for this Student ID.";
      case "auth/wrong-password":
        return "Invalid Student ID or Password.";
      case "auth/too-many-requests":
        return "Too many login attempts. Please try again later.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // 1. Validation for Registration
    if (!isLogin) {
      if (!email.toLowerCase().endsWith("@hcdc.edu.ph")) {
        return triggerError("Please use your official @hcdc.edu.ph email.");
      }

      if (!fullName.trim()) {
        return triggerError("Full Name is required.");
      }

      if (!isStrongPassword) {
        return triggerError("Password must be 8-12 chars and include uppercase, lowercase, number, and !@#$%^&.");
      }
    }

    // 2. Validation for both Login and Registration
    if (studentId.length !== 8) {
      return triggerError("Student ID must be exactly 8 digits.");
    }

    if (!password.trim()) {
      return triggerError("Password is required.");
    }

    try {
      if (!auth || !db) {
        triggerError("Firebase is not configured. Check your environment variables.");
        setLoading(false);
        return;
      }

      if (isLogin) {
        // --- LOGIN LOGIC ---
        // Find email by student ID in Firestore
        const userQuery = query(
          collection(db, "users"),
          where("studentId", "==", studentId),
          limit(1)
        );

        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          return triggerError("Invalid Student ID or Password.");
        }

        const userData = userSnapshot.docs[0].data();
        const savedEmail = userData.email;
        const savedName = (userData.fullName || userData.name || "Voter") as string;
        const savedStudentId = (userData.studentId || studentId) as string;
        const savedProfilePic = (userData.profilePic || null) as string | null;

        await signInWithEmailAndPassword(auth, savedEmail, password);
        localStorage.setItem("voterName", savedName);
        localStorage.setItem("voterId", savedStudentId);
        localStorage.setItem("voterEmail", savedEmail);
        if (savedProfilePic) {
          localStorage.setItem("voterPic", savedProfilePic);
        }

        router.push('/vote');
      } else {
        // --- REGISTRATION LOGIC ---

        // Check if student ID already exists
        const studentIdQuery = query(
          collection(db, "users"),
          where("studentId", "==", studentId),
          limit(1)
        );

        const studentIdSnapshot = await getDocs(studentIdQuery);

        if (!studentIdSnapshot.empty) {
          return triggerError("Student ID is already registered.");
        }

        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.toLowerCase(),
          password
        );

        const user = userCredential.user;

        // Save extra info to Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          studentId,
          fullName: fullName.trim(),
          email: email.toLowerCase(),
          createdAt: new Date().toISOString(),
        });

        setLoading(false);
        setSuccessMsg("Account created! Please sign in.");
        setIsLogin(true);
        setPassword("");
        setEmail("");
        setFullName("");
      }
    } catch (err: any) {
      triggerError(getFirebaseErrorMessage(err?.code));
    }
  };

  return (
    <div className={`${poppins.className} relative min-h-screen flex flex-col items-center justify-center gap-8 p-4 sm:p-6 bg-[#FAFAFA] overflow-hidden`}>
      <div className="absolute top-0 left-0 w-full h-full -z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[40%] bg-[#f05a28]/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[40%] bg-orange-200/20 rounded-full blur-[80px]" />
      </div>

      <motion.div
        layout
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[460px]"
      >
        <div className="bg-white/80 backdrop-blur-2xl p-6 xs:p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-white ring-1 ring-black/[0.03]">

          <div className="text-center mb-8">
            <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <Image src="/cet.png" alt="CET Logo" width={90} height={90} className="relative mx-auto drop-shadow-xl mb-4 w-[100px] h-[100px] sm:w-[110px] sm:h-[110px]" priority />
            </motion.div>

            <motion.h1 layout className="text-3xl sm:text-4xl font-[900] text-gray-900 tracking-tighter italic">
              CET<span className="text-[#f05a28] ml-1">VOTE</span>
            </motion.h1>
            <p className="text-[10px] font-700 text-gray-400 uppercase tracking-[0.2em] mt-1">
              {isLogin ? "CET Official Election Portal" : "Create Voter Account"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-semibold leading-tight">{error}</p>
              </motion.div>
            )}
            {successMsg && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 shadow-sm">
                <CheckCircle2 size={18} className="shrink-0" />
                <p className="text-xs font-semibold leading-tight">{successMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div key="signup-fields" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-700 text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <div className="relative">
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f05a28]" size={18} />
                      <input
                        required
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-xl border border-gray-100 focus:ring-4 focus:ring-[#f05a28]/10 focus:border-[#f05a28] outline-none transition-all font-medium text-base text-gray-800"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-700 text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f05a28]" size={18} />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="@hcdc.edu.ph"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-xl border border-gray-100 focus:ring-4 focus:ring-[#f05a28]/10 focus:border-[#f05a28] outline-none transition-all font-medium text-base text-gray-800"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div key="identity-fields" layout className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-700 text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Student ID</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f05a28]" size={18} />
                    <input
                      required
                      type="text"
                      value={studentId}
                      onChange={handleIdChange}
                      placeholder="598-XXXXX"
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-xl border border-gray-100 focus:ring-4 focus:ring-[#f05a28]/10 focus:border-[#f05a28] outline-none transition-all font-medium text-base text-gray-800 font-mono"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-[10px] font-700 text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Security Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f05a28]" size={18} />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-11 py-3.5 bg-gray-50/50 rounded-xl border border-gray-100 focus:ring-4 focus:ring-[#f05a28]/10 focus:border-[#f05a28] outline-none transition-all font-medium text-base text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-[#f05a28] hover:bg-[#f05a28]/5 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {!isLogin && password.length > 0 && (
                    <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Password Strength</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${passwordStrengthClass}`}>{passwordStrength}</p>
                      </div>

                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${passwordMeterClass}`} style={{ width: passwordMeterWidth }} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-1">
                        <p className={`text-[11px] font-semibold ${passwordChecks.length ? 'text-green-600' : 'text-gray-500'}`}>
                          {passwordChecks.length ? '✔' : '✖'} 8-12 characters
                        </p>
                        <p className={`text-[11px] font-semibold ${passwordChecks.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                          {passwordChecks.uppercase ? '✔' : '✖'} Uppercase (A-Z)
                        </p>
                        <p className={`text-[11px] font-semibold ${passwordChecks.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                          {passwordChecks.lowercase ? '✔' : '✖'} Lowercase (a-z)
                        </p>
                        <p className={`text-[11px] font-semibold ${passwordChecks.number ? 'text-green-600' : 'text-gray-500'}`}>
                          {passwordChecks.number ? '✔' : '✖'} Number (0-9)
                        </p>
                        <p className={`text-[11px] font-semibold ${passwordChecks.special ? 'text-green-600' : 'text-gray-500'} sm:col-span-2`}>
                          {passwordChecks.special ? '✔' : '✖'} Special (!@#$%^&)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <button type="submit" disabled={loading || (!isLogin && !isStrongPassword)} className="w-full relative bg-[#111] hover:bg-[#f05a28] text-white font-black py-4 rounded-xl shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4 overflow-hidden group">
              <div className="relative z-10 flex items-center justify-center gap-2 text-sm tracking-tight uppercase">
                {loading ? (
                  <><Loader2 className="animate-spin" size={18} /><span>Validating...</span></>
                ) : (
                  <>{isLogin ? "LOGIN" : "Register Account"}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </div>
            </button>

            {isLogin && (
              <>
                <div className="mt-6 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500 font-medium">OR</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full mt-6 px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-[#f05a28] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {googleLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span className="text-sm tracking-tight uppercase font-black">Sign in with Google</span>
                  )}
                </button>
              </>
            )}

          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccessMsg("");
                setPassword("");
                setGoogleLoading(false);
                setShowVerificationModal(false);
                setShowGoogleIdWizard(false);
              }}
              className="text-xs font-bold text-gray-500 hover:text-[#f05a28] transition-colors group"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-[#f05a28] underline decoration-2 underline-offset-4 group-hover:no-underline font-black">
                {isLogin ? "Register now" : "Login here"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {showVerificationModal && pendingGoogleEmail && (
        <VerificationCodeModal
          email={pendingGoogleEmail}
          onVerified={handleGoogleVerificationComplete}
          onCancel={async () => {
            if (auth?.currentUser) {
              await signOut(auth);
            }
            if (typeof window !== "undefined") {
              localStorage.removeItem("cetvote_verification_payload");
            }
            setShowVerificationModal(false);
            setPendingGoogleEmail("");
            setPendingGoogleUid("");
          }}
          onResend={async () => {
            if (!pendingGoogleEmail) {
              return;
            }
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
                disabled={googleIdLoading || googleIdNumber.length !== 8}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111] px-4 py-3 font-black uppercase tracking-wide text-white transition-colors hover:bg-[#f05a28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleIdLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
}