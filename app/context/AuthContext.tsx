"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, signInWithPopup, signOut, onAuthStateChanged, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface GoogleSignInResult {
  email: string;
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (validateDomain?: boolean) => Promise<GoogleSignInResult | null>;
  logout: () => Promise<void>;
  userEmail: string | null;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  sendVerificationCode: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Handle redirect result for mobile sign-in
  useEffect(() => {
    const handleRedirectResult = async () => {
      if (!auth) return;

      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const email = result.user.email;
          // Validate email domain for redirect flow
          if (email && !email.endsWith("@hcdc.edu.ph")) {
            await signOut(auth);
            // You might want to show an error message to the user here
            console.error("Only @hcdc.edu.ph email addresses are allowed");
          }
        }
      } catch (error) {
        console.error("Redirect result error:", error);
        // Handle redirect errors (e.g., user cancelled, network issues)
      }
    };

    handleRedirectResult();
  }, []);

  const signInWithGoogle = async (validateDomain: boolean = true): Promise<GoogleSignInResult | null> => {
    if (!auth) throw new Error("Firebase Auth is not initialized");

    try {
      // Detect mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      let result;
      if (isMobile) {
        // Use redirect flow for mobile devices
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await signInWithRedirect(auth, provider);
        // This will redirect the user, so we return null here
        // The result will be handled in the useEffect that listens for auth state changes
        return null;
      } else {
        // Use popup flow for desktop
        result = await signInWithPopup(auth, googleProvider);
      }

      const email =
        result?.user?.email ||
        (result?.additionalUserInfo?.profile as { email?: string } | null)?.email ||
        null;

      // Validate email domain
      if (validateDomain && (!email || !email.endsWith("@hcdc.edu.ph"))) {
        await signOut(auth);
        throw new Error("Only @hcdc.edu.ph email addresses are allowed");
      }

      if (!email) {
        await signOut(auth);
        throw new Error("Failed to obtain email from Google account.");
      }

      return {
        email,
        uid: result.user.uid,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const storageKey = "cetvote_verification_payload";

  const saveVerificationPayload = (payload: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, payload);
    }
  };

  const clearVerificationPayload = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  };

  const getVerificationPayload = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(storageKey);
  };

  const sendVerificationCode = async (email: string): Promise<boolean> => {
    try {
      console.log("[sendVerificationCode] Sending code to:", email);
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log("[sendVerificationCode] Response status:", response.status);
      console.log("[sendVerificationCode] Response data:", data);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      if (data.verificationPayload) {
        console.log("[sendVerificationCode] Saving payload to localStorage");
        saveVerificationPayload(data.verificationPayload);
      } else {
        console.warn("[sendVerificationCode] No payload in response");
      }

      return true;
    } catch (error) {
      console.error("[sendVerificationCode] Error:", error);
      throw error;
    }
  };

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    try {
      const payload = getVerificationPayload();
      console.log("[verifyCode] Email:", email);
      console.log("[verifyCode] Code:", code);
      console.log("[verifyCode] Payload exists:", !!payload);
      
      const response = await fetch("/api/auth/send-verification-code", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          verificationPayload: payload,
        }),
      });

      const data = await response.json();
      console.log("[verifyCode] Response status:", response.status);
      console.log("[verifyCode] Response data:", data);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify code");
      }

      clearVerificationPayload();
      return true;
    } catch (error) {
      console.error("[verifyCode] Error:", error);
      throw error;
    }
  };


  const logout = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    logout,
    userEmail: user?.email || null,
    verifyCode,
    sendVerificationCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
