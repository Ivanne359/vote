"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { Loader2, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";

export default function VoteLoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/vote/candidate");
    }
  }, [user, loading, router]);

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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CETVOTE</h1>
          <p className="text-gray-600">Secure Student Election Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome to Voting</h2>
          <p className="text-gray-600 text-center mb-8">
            Sign in with your Google account to start voting securely.
          </p>

          {/* Email Info */}
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

          {/* Sign In Button */}
          <GoogleSignInButton />

          {/* Security Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              ✓ Your email is encrypted and secure<br />
              ✓ One vote per registered student<br />
              ✓ OAuth 2.0 secured authentication
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
