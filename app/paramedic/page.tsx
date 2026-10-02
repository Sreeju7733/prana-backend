"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ParamedicSession {
  id: string;
  responder_code: string;
  name: string;
  employee_id: string;
  organization: string;
  organization_type: string;
  phone: string;
  expires_at: string;
}

interface PatientRecord {
  patient: {
    prana_id: string;
    full_name: string;
    gender: string;
    blood_group: string;
    age: number;
  };
  allergies: Array<{
    id: string;
    allergen: string;
    severity?: string;
    reaction_description?: string;
    is_critical?: boolean;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dose: string;
    frequency?: string;
  }>;
  conditions: Array<{
    id: string;
    name: string;
    status?: string;
  }>;
  devices: Array<{
    id: string;
    name?: string;
    device_name?: string;
  }>;
  surgeries: Array<{
    id: string;
    procedure?: string;
    surgery_name?: string;
  }>;
  vitals: Array<{
    id: string;
    vital_type: string;
    value: number;
    unit: string;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phone?: string;
    phone_number?: string;
  }>;
}

export default function ParamedicAppWhite() {
  const [session, setSession] = useState<ParamedicSession | null>(null);
  const [badgeCode, setBadgeCode] = useState("PARAM-7701");
  const [badgePhone, setBadgePhone] = useState("9811223344");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [pranaInput, setPranaInput] = useState("PRAN-ba42c5c2");
  const [isFetching, setIsFetching] = useState(false);
  const [patientData, setPatientData] = useState<PatientRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("prana_paramedic_app_session");
      if (savedSession) {
        setSession(JSON.parse(savedSession));
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/paramedic/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responder_code: badgeCode.trim(),
          phone: badgePhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Paramedic badge verification failed");
      }

      setSession(data.responder);
      localStorage.setItem("prana_paramedic_app_session", JSON.stringify(data.responder));
      fetchEmergencyRecord(pranaInput);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Badge authentication failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchEmergencyRecord = async (pid: string) => {
    if (!pid.trim()) return;
    setIsFetching(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/card/scan-details?pid=${encodeURIComponent(pid.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.patient) {
        throw new Error(data.error || "Patient PRANA ID not found in emergency network");
      }

      setPatientData(data as PatientRecord);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Could not fetch emergency record");
      setPatientData(null);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans max-w-md mx-auto border-x border-slate-200 shadow-sm antialiased">
      {/* Mobile App Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white text-base font-bold shadow-xs">
            🚑
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Paramedic Field App</h1>
            <p className="text-[10px] text-red-600 font-semibold font-mono">EMERGENCY FIRST RESPONDER</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/scan" className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-md font-semibold text-slate-700">
            📷 QR
          </Link>
          <Link href="/hospitals" className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-md font-semibold">
            🏥 Hospital
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-4">
        {/* Badge Login Card */}
        {!session ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Responder Badge Verification
              </span>
              <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded">
                Tier-3
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Badge Code / Responder Code
                </label>
                <input
                  type="text"
                  value={badgeCode}
                  onChange={(e) => setBadgeCode(e.target.value)}
                  placeholder="PARAM-7701"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Mobile Number
                </label>
                <input
                  type="tel"
                  value={badgePhone}
                  onChange={(e) => setBadgePhone(e.target.value)}
                  placeholder="9811223344"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-xs"
              >
                {isLoggingIn ? "Verifying Credentials..." : "Authorize Paramedic Badge"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs shadow-xs">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {session.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{session.responder_code} • {session.organization}</div>
            </div>
            <button
              onClick={() => { setSession(null); localStorage.removeItem("prana_paramedic_app_session"); }}
              className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200"
            >
              Sign out
            </button>
          </div>
        )}

        {/* PRANA Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
          <label className="block text-xs font-bold text-slate-700">Enter Patient PRANA ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pranaInput}
              onChange={(e) => setPranaInput(e.target.value)}
              placeholder="PRAN-ba42c5c2"
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none uppercase focus:ring-1 focus:ring-red-600"
            />
            <button
              onClick={() => fetchEmergencyRecord(pranaInput)}
              disabled={isFetching || !pranaInput}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-3.5 rounded-lg text-xs transition shadow-xs"
            >
              {isFetching ? "..." : "Fetch"}
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Patient Details Display */}
        {patientData && (
          <div className="space-y-3 animate-fade-in">
            {/* Identity Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{patientData.patient.full_name}</h2>
                <div className="text-xs text-slate-500 font-medium">
                  {patientData.patient.age || 19} Yrs • {patientData.patient.gender} • <span className="font-mono font-bold text-slate-700">{patientData.patient.prana_id}</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-1.5 text-center">
                <span className="block text-[8px] uppercase font-bold text-red-600">Blood Group</span>
                <span className="text-xl font-black text-red-700">{patientData.patient.blood_group}</span>
              </div>
            </div>

            {/* Critical Allergies */}
            <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span> Critical Allergies & Adverse Reactions
              </span>
              {patientData.allergies && patientData.allergies.length > 0 ? (
                <ul className="space-y-1.5">
                  {patientData.allergies.map((a, idx) => (
                    <li key={idx} className="text-xs text-slate-800">
                      <strong>• {a.allergen}</strong> ({a.severity || "Severe"}) - {a.reaction_description || "Anaphylaxis risk"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">No critical drug allergies on record.</p>
              )}
            </div>

            {/* Medications */}
            {patientData.medications && patientData.medications.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                <span className="text-xs font-bold text-slate-700 uppercase">Active Medications</span>
                <ul className="space-y-1 text-xs">
                  {patientData.medications.map((m, idx) => (
                    <li key={idx} className="text-slate-800">
                      • <strong>{m.name}</strong> <span className="text-slate-500">{m.dose}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Baseline Vitals */}
            {patientData.vitals && patientData.vitals.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                <span className="text-xs font-bold text-slate-700 uppercase">Baseline Telemetry</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {patientData.vitals.map((v, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <span className="block text-[9px] uppercase font-bold text-slate-500">{v.vital_type.replace("_", " ")}</span>
                      <span className="text-base font-black text-slate-900">{v.value} {v.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contacts */}
            {patientData.contacts && patientData.contacts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                <span className="text-xs font-bold text-slate-700 uppercase">Emergency Relay</span>
                <div className="space-y-2 text-xs">
                  {patientData.contacts.map((c, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.relationship}</div>
                      </div>
                      <a
                        href={`tel:${c.phone || c.phone_number}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                      >
                        📞 Call
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
