"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HospitalLoginPage() {
  const router = useRouter();

  const [hospitalId, setHospitalId] = useState("HOSP-AIIMS-01");
  const [password, setPassword] = useState("1234");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hospitalsList = [
    { id: "HOSP-AIIMS-01", name: "AIIMS New Delhi - Trauma & Emergency Center", reg: "REG-AIIMS-2024-001" },
    { id: "HOSP-MAX-02", name: "Max Super Speciality Hospital Saket", reg: "REG-MAX-2023-042" },
    { id: "HOSP-APOLLO-03", name: "Indraprastha Apollo Hospitals", reg: "REG-APOLLO-2022-819" },
    { id: "HOSP-FORTIS-04", name: "Fortis Memorial Research Institute", reg: "REG-FORTIS-2023-110" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hospital-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: hospitalId.trim(),
          password: password.trim(),
          pin: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      // Save credentials in session storage / local storage
      localStorage.setItem("prana_hosp_session", JSON.stringify(data.hospital));
      localStorage.setItem("prana_staff_session", JSON.stringify(data.staff));
      localStorage.setItem("prana_hosp_token", data.token);

      // Redirect directly to the Hospital EHR Workstation
      router.push("/hospitals");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hospital login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-teal-600 selection:text-white antialiased">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
            🏥
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              PRANA Hospital Network
            </span>
            <span className="text-[10px] bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded ml-2 font-mono font-bold uppercase">
              Clinical Access Gateway
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">
            🛡️ Superadmin
          </Link>
          <Link href="/paramedic" className="text-slate-600 hover:text-slate-900">
            🚑 Paramedic App
          </Link>
          <Link href="/scan" className="text-slate-600 hover:text-slate-900">
            📷 QR Scanner
          </Link>
        </div>
      </header>

      {/* Main Login Form Container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl mx-auto shadow-xs">
              🩺
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Clinical Login</h1>
            <p className="text-xs text-slate-500">
              Sign in with your hospital ID and password.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Accredited Hospital Facility
              </label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
              >
                {hospitalsList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hospital Facility Access Password / PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter hospital terminal password (e.g. 1234)"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-xs disabled:opacity-50 mt-2"
            >
              {isLoading ? "Authenticating Facility..." : "Sign In to Hospital Portal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
