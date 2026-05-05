"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { LogOut, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GoogleUserProfile() {
  const { user, logout, loading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading || !user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "User"}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <User className="w-5 h-5 text-gray-600" />
        )}
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
            {user.displayName || "User"}
          </p>
          <p className="text-xs text-gray-500 truncate max-w-[150px]">
            {user.email}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">
                {user.displayName || "User"}
              </p>
              <p className="text-xs text-gray-600 break-words">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Sign out
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
