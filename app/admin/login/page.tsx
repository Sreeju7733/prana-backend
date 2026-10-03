"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SuperadminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Superadmin Login • PRANA National Authority";
  }, []);

  const [email, setEmail] = useState("admin@prana.health");
  const [password, setPassword] = useState("prana@admin2026");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid superadmin credentials");
      }

      // Store superadmin session in localStorage
      localStorage.setItem("prana_admin_token", data.token);
      localStorage.setItem("prana_admin_email", data.admin.email);
      localStorage.setItem("prana_admin_user", JSON.stringify(data.admin));

      // Redirect directly to the Superadmin Console
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failure");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white antialiased">
      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-700 flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-105 transition">
            🛡️
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">
              PRANA Authority
            </span>
            <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider font-mono">
              National Health Infrastructure
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link
            href="/hospitals/login"
            className="text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5"
          >
            <span>🏥</span>
            <span>Hospital Portal</span>
          </Link>
          <span className="text-slate-200">|</span>
          <Link
            href="/paramedic"
            className="text-slate-600 hover:text-slate-900 transition hidden sm:flex items-center gap-1.5"
          >
            <span>🚑</span>
            <span>Paramedic PWA</span>
          </Link>
          <span className="text-slate-200 hidden sm:inline">|</span>
          <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Superadmin Gateway Online
          </div>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-sm space-y-6">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-2xl mx-auto shadow-xs">
                🛡️
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Superadmin Command Console
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Sign in with your national authority credentials to administer accredited hospitals, responders, and keys.
              </p>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Authority Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@prana.health"
                    required
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 font-mono text-xs outline-none transition"
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">✉️</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Master Passphrase
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-indigo-700 font-bold hover:underline transition"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter master password"
                    required
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 font-mono text-xs outline-none transition"
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">🔒</span>
                </div>
              </div>

              {/* Demo Credentials Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Demo Authority Credentials:</span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-mono">
                    Pre-filled
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 flex flex-col gap-0.5 pt-0.5">
                  <div>Email: <strong className="text-slate-900">admin@prana.health</strong></div>
                  <div>Pass: <strong className="text-slate-900">prana@admin2026</strong></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate as Superadmin</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Zero-Knowledge Privacy Badge */}
            <div className="pt-3 border-t border-slate-100 text-center space-y-1">
              <div className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
                <span>🔒</span> Zero-Knowledge Patient Privacy Enforcement
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Superadmin accounts have administrative authority over credentials and facilities, but are cryptographically air-gapped from patient clinical charts and medical history.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="py-4 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="font-bold text-slate-700">PRANA INFRASTRUCTURE</span>
          <span>•</span>
          <span className="text-slate-500">ISO 27001 / HIPAA Compliant Authority Gateway</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <Link href="/hospitals/login" className="hover:text-slate-800 transition">
            Hospital Login
          </Link>
          <Link href="/paramedic" className="hover:text-slate-800 transition">
            EMS Paramedic
          </Link>
          <Link href="/scan" className="hover:text-slate-800 transition">
            QR Scanner
          </Link>
        </div>
      </footer>
    </div>
  );
}
