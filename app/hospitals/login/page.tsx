"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HospitalLoginPage() {
  const router = useRouter();

  const [hospitalId, setHospitalId] = useState("HOSP-AIIMS-01");
  const [doctorId, setDoctorId] = useState("DOC-STAFF-01");
  const [doctorName, setDoctorName] = useState("Attending Duty Physician");
  const [department, setDepartment] = useState("Emergency Medicine & Trauma Resuscitation");
  const [pin, setPin] = useState("1234");
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
          doctor_id: doctorId.trim(),
          doctor_name: doctorName.trim(),
          department: department.trim(),
          pin: pin.trim(),
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
              Authenticate your accredited medical facility and duty physician credentials to access universal patient EHR records.
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
                Attending Doctor / Physician Name
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Attending Duty Physician"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Doctor ID / Badge #
                </label>
                <input
                  type="text"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  placeholder="DOC-9081"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Terminal PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Clinical Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="Emergency Medicine & Trauma Resuscitation">Emergency Medicine & Trauma Resuscitation</option>
                <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                <option value="Cardiology & Cath Lab">Cardiology & Cath Lab</option>
                <option value="General Surgery & Orthopedics">General Surgery & Orthopedics</option>
                <option value="Cashless Insurance & TPA Desk">Cashless Insurance & TPA Desk</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-xs disabled:opacity-50 mt-2"
            >
              {isLoading ? "Authenticating Workstation..." : "Sign In to Hospital EHR"}
            </button>
          </form>

          {/* Quick Credential Hints */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">Demonstration Credentials:</span>
            <div>Hospital: <span className="font-mono text-teal-800">AIIMS New Delhi (HOSP-AIIMS-01)</span></div>
            <div>Doctor / Staff: <span className="font-semibold text-slate-700">Attending Duty Physician (PIN: 1234)</span></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-200 bg-white flex items-center justify-center text-xs text-slate-500">
        PRANA Healthcare Cryptographic Access Protocol • National Health Authority Compliance
      </footer>
    </div>
  );
}
