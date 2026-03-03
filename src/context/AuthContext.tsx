"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { auth, onAuthStateChanged, signOut, type User } from "@/lib/firebase";
import type { AppUser } from "@/types";
import axios from "axios";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppUser = useCallback(async (user: User) => {
    try {
      const idToken = await user.getIdToken();
      const res = await axios.post("/api/auth/verify", { idToken });
      if (res.data.success) {
        setAppUser(res.data.data.user);
      }
    } catch (err) {
      console.error("Failed to fetch app user:", err);
      setAppUser(null);
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const code = err.response?.data?.code;
        if (status === 500) {
          // Server error — sign out stale Firebase session to stop retrying
          await signOut().catch(() => {});
        } else if (status === 404 && code === "NOT_REGISTERED") {
          // Firebase session exists but no Airtable record — sign out so user can sign up cleanly
          await signOut().catch(() => {});
        }
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchAppUser(firebaseUser);
    }
  }, [firebaseUser, fetchAppUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        await fetchAppUser(user);
      } else {
        // No Firebase user — check if there's a cookie session (e.g. dev bypass)
        try {
          const res = await axios.get("/api/auth/verify-cookie");
          if (res.data.success) {
            setAppUser(res.data.data);
          } else {
            setAppUser(null);
          }
        } catch {
          setAppUser(null);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchAppUser]);

  const handleSignOut = useCallback(async () => {
    try {
      await axios.delete("/api/auth/verify");
      await signOut();
      setFirebaseUser(null);
      setAppUser(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        signOut: handleSignOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
