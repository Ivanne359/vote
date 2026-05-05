"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, AlertCircle, CheckCircle2, Mail, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface VerificationCodeModalProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
  onResend?: () => Promise<void>;
}

export default function VerificationCodeModal({
  email,
  onVerified,
  onCancel,
  onResend,
}: VerificationCodeModalProps) {
  const { verifyCode } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes

  // Timer effect
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

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (code.length !== 6) {
        throw new Error("Verification code must be 6 digits");
      }

      if (isExpired) {
        throw new Error("Verification code expired. Please request a new code.");
      }

      await verifyCode(email, code);
      setSuccess(true);

      setTimeout(() => {
        onVerified();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to verify code";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  const handleResend = async () => {
    if (!onResend) {
      return;
    }

    try {
      setResending(true);
      setError(null);
      await onResend();
      setTimeLeft(180);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend verification code";
      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
      >
        {success ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mb-4 flex justify-center"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Email Verified!
            </h3>
            <p className="text-gray-600">
              You can now continue signing in.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Verify Your Email
              </h2>
              <p className="text-gray-600 text-center text-sm">
                We sent a 6-digit code to
                <br />
                <span className="font-semibold text-gray-900">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Code expires in:</span>
                <div className="flex items-center gap-1 text-orange-600 font-semibold">
                  <Clock className="w-4 h-4" />
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
              </div>

              {loading && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Checking code securely, please wait...
                </p>
              )}

              {isExpired && !success && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This code has expired. Click Resend to receive a new 6-digit code.
                </p>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6 || isExpired}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-blue-600 hover:underline font-semibold"
                  disabled={loading || resending || !onResend}
                >
                  {resending ? "Resending..." : "Resend"}
                </button>
              </p>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
