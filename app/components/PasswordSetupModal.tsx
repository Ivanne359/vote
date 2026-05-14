"use client";

import { useState, type FormEvent } from "react";
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordSetupModalProps {
  email: string;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => Promise<void> | void;
  mode?: "setup" | "reset";
}

const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    password.length <= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&]/.test(password)
  );
};

export default function PasswordSetupModal({ email, onSubmit, onCancel, mode = "setup" }: PasswordSetupModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isResetMode = mode === "reset";
  const passwordChecks = {
    length: password.length >= 8 && password.length <= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&]/.test(password),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError("Use 8-12 characters with uppercase, lowercase, number, and !@#$%^&.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit(password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Lock className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            {isResetMode ? "Set Up Your New Password" : "Set Your App Password"}
          </h2>
          <p className="text-center text-sm text-gray-600">
            {isResetMode
              ? "Please set up your new password to continue for "
              : "Please set up your password to continue for "}
            <span className="font-semibold text-gray-900">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-12 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Password Strength</p>
                <p className={`text-[10px] font-black uppercase tracking-widest ${passwordStrengthClass}`}>{passwordStrength}</p>
              </div>

              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className={`h-full transition-all duration-300 ${passwordMeterClass}`} style={{ width: passwordMeterWidth }} />
              </div>

              <div className="grid grid-cols-1 gap-1 pt-1 text-sm sm:grid-cols-2">
                <p className={passwordChecks.length ? "text-green-600" : "text-gray-500"}>• 8-12 characters</p>
                <p className={passwordChecks.uppercase ? "text-green-600" : "text-gray-500"}>• Uppercase letter</p>
                <p className={passwordChecks.lowercase ? "text-green-600" : "text-gray-500"}>• Lowercase letter</p>
                <p className={passwordChecks.number ? "text-green-600" : "text-gray-500"}>• Number</p>
                <p className={passwordChecks.special ? "text-green-600" : "text-gray-500"}>• Special (!@#$%^&)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the password"
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-12 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
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
                  Saving...
                </>
              ) : (
                isResetMode ? "Change" : "Save Password"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}