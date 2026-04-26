"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Loader2, ArrowRight, AlertCircle, Mail, IdCard, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Poppins } from 'next/font/google';

import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900']
});

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [shake, setShake] = useState(false);

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

        await signInWithEmailAndPassword(auth, savedEmail, password);

        localStorage.setItem("voterName", savedName);
        localStorage.setItem("voterId", savedStudentId);

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
    <div className={`${poppins.className} relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#FAFAFA] overflow-hidden`}>
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

          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccessMsg("");
                setPassword("");
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
    </div>
  );
}