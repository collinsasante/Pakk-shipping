"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Package } from "lucide-react";
import Link from "next/link";
import axios from "axios";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">or</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError } = useToast();

  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [devLoading, setDevLoading]         = useState(false);

  const redirect = searchParams?.get("redirect");

  const goToDashboard = (role: string) => {
    if (redirect) return router.replace(redirect);
    router.replace(role === "customer" ? "/customer" : "/admin");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fbUser  = await signIn(email, password);
      const idToken = await fbUser.getIdToken();
      const res     = await axios.post("/api/auth/verify", { idToken });
      goToDashboard(res.data.data.user.role);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Login failed"
        : err instanceof Error ? err.message : "Invalid email or password";
      toastError("Login failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const res = await axios.post("/api/auth/verify", { idToken: "DEV_ADMIN_TEST_TOKEN" });
      goToDashboard(res.data.data.user.role);
    } catch {
      toastError("Dev login failed", "Make sure NODE_ENV=development");
    } finally {
      setDevLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result  = await signInWithGoogle();
      const idToken = await result.user.getIdToken();

      const res = await axios
        .post("/api/auth/verify", { idToken })
        .catch((err) => {
          if (axios.isAxiosError(err) && err.response?.data?.code === "NOT_REGISTERED") {
            return null;
          }
          throw err;
        });

      if (res) {
        goToDashboard(res.data.data.user.role);
      } else {
        toastError(
          "Account not found",
          "Your account hasn't been set up yet. Contact your administrator."
        );
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      const msg = raw.includes("popup-closed")
        ? "Sign-in cancelled"
        : axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Google sign-in failed"
        : "Google sign-in failed";
      toastError("Sign-in failed", msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-900 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Package className="h-6 w-6 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tight">Pakkmaxx</span>
        </div>
        <div>
          <h1 className="text-4xl font-black leading-tight mb-4">
            Your trusted freight<br />partner from USA<br />to Ghana 🇬🇭
          </h1>
          <p className="text-brand-200 text-lg">
            Track your packages, manage orders, and get real-time updates via WhatsApp.
          </p>
        </div>
        <div className="flex gap-6">
          <div><p className="text-3xl font-black">500+</p><p className="text-brand-200 text-sm">Happy customers</p></div>
          <div><p className="text-3xl font-black">10K+</p><p className="text-brand-200 text-sm">Packages delivered</p></div>
          <div><p className="text-3xl font-black">99%</p><p className="text-brand-200 text-sm">On-time delivery</p></div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-xl text-gray-900">Pakkmaxx</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to access your dashboard</p>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <GoogleIcon />}
              Continue with Google
            </button>

            <Divider />

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link href="/reset-password" className="text-sm text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading} disabled={googleLoading}>
                Sign In
              </Button>
            </form>

            {process.env.NODE_ENV === "development" && (
              <button
                type="button"
                onClick={handleDevLogin}
                disabled={devLoading}
                className="mt-4 w-full h-9 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {devLoading ? "Logging in..." : "Dev Login (Admin) — dev only"}
              </button>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              Need access? Contact your Pakkmaxx administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
