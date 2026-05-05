"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, signInWithPopup, signOut, onAuthStateChanged, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (validateDomain?: boolean) => Promise<string | null>;
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

  const signInWithGoogle = async (validateDomain: boolean = true): Promise<string | null> => {
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

      const email = result.user.email;

      // Validate email domain
      if (validateDomain && email && !email.endsWith("@hcdc.edu.ph")) {
        await signOut(auth);
        throw new Error("Only @hcdc.edu.ph email addresses are allowed");
      }

      return email;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const sendVerificationCode = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send verification code");
      }

      return true;
    } catch (error) {
      console.error("Error sending verification code:", error);
      throw error;
    }
  };

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify code");
      }

      return true;
    } catch (error) {
      console.error("Error verifying code:", error);
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
