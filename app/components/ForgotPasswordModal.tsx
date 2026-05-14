"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Clock, Loader2, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ForgotPasswordModalProps {
  onVerified: (email: string) => void;
  onCancel: () => void;
}

type Step = "email" | "code";

export default function ForgotPasswordModal({ onVerified, onCancel }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const [verificationPayload, setVerificationPayload] = useState<string | null>(null);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendCode = async (targetEmail: string) => {
    const response = await fetch("/api/auth/send-verification-code", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, purpose: "password-reset" }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string; verificationPayload?: string } | null;

    if (!response.ok) {
      throw new Error(data?.error || "Failed to send verification code");
    }

    setVerificationPayload(data?.verificationPayload || null);
  };

  const handleSendEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await sendCode(normalizedEmail);
      setEmail(normalizedEmail);
      setStep("code");
      setTimeLeft(180);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Verification code must be 6 digits.");
      return;
    }

    if (isExpired) {
      setError("Verification code expired. Please resend a new code.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/send-verification-code", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          verificationPayload,
          purpose: "password-reset",
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to verify code");
      }

      onVerified(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setError(null);
      await sendCode(email);
      setTimeLeft(180);
      setCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <ShieldCheck className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Forgot Password</h2>
          <p className="text-sm text-gray-600">
            Enter your email, verify the code sent to your Gmail, then create a new password.
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 pl-11 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#111] px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Code"
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="rounded-xl bg-orange-50/40 p-4 text-center">
              <p className="text-sm text-gray-600">We sent a 6-digit code to</p>
              <p className="mt-1 break-all font-semibold text-gray-900">{email}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Code expires in:</span>
              <div className="flex items-center gap-1 font-semibold text-orange-600">
                <Clock className="h-4 w-4" />
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
            </div>

            {isExpired && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This code has expired. Please resend a new one.
              </p>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6 || isExpired}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#111] px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </button>
            </div>

            <p className="pt-2 text-center text-xs text-gray-500">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || loading}
                className="font-semibold text-orange-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? "Resending..." : "Resend"}
              </button>
            </p>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}