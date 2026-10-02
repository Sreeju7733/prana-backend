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

export default function ParamedicAppPage() {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Mobile App Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white text-lg font-black">
            🚑
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-tight">Paramedic PWA</h1>
            <p className="text-[10px] text-red-400 font-mono">EMERGENCY FIELD UNIT</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/scan" className="text-[11px] bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded font-bold">
            📷 QR
          </Link>
          <Link href="/hospitals" className="text-[11px] bg-teal-950 text-teal-300 border border-teal-800 px-2.5 py-1 rounded font-bold">
            🏥 Hospital
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-4">
        {/* Badge Login Modal / Card */}
        {!session ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Paramedic Badge Authentication
              </span>
              <span className="text-[10px] bg-red-950 border border-red-800 text-red-400 font-bold px-2 py-0.5 rounded">
                Tier-3 Clearance
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Badge Code / Responder ID
                </label>
                <input
                  type="text"
                  value={badgeCode}
                  onChange={(e) => setBadgeCode(e.target.value)}
                  placeholder="PARAM-7701"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Official Phone
                </label>
                <input
                  type="tel"
                  value={badgePhone}
                  onChange={(e) => setBadgePhone(e.target.value)}
                  placeholder="9811223344"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none"
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800 text-[11px] text-red-300">
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow"
              >
                {isLoggingIn ? "Verifying..." : "Authorize Paramedic Terminal"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {session.name}
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">{session.responder_code} • {session.organization}</span>
            </div>
            <button
              onClick={() => { setSession(null); localStorage.removeItem("prana_paramedic_app_session"); }}
              className="text-[10px] bg-red-950 text-red-300 px-2 py-1 rounded border border-red-800"
            >
              Logout
            </button>
          </div>
        )}

        {/* Search Patient Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-300">Enter Patient PRANA ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pranaInput}
              onChange={(e) => setPranaInput(e.target.value)}
              placeholder="PRAN-ba42c5c2"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none uppercase"
            />
            <button
              onClick={() => fetchEmergencyRecord(pranaInput)}
              disabled={isFetching || !pranaInput}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-3.5 rounded-xl text-xs transition"
            >
              {isFetching ? "..." : "Fetch"}
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800 text-[11px] text-red-300">
              ❌ {errorMsg}
            </div>
          )}
        </div>

        {/* Patient Emergency Details */}
        {patientData && (
          <div className="space-y-3 animate-fade-in">
            {/* Identity Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">{patientData.patient.full_name}</h2>
                <div className="text-xs text-slate-400 font-medium">
                  {patientData.patient.age || 19} Yrs • {patientData.patient.gender} • <span className="font-mono text-cyan-400">{patientData.patient.prana_id}</span>
                </div>
              </div>

              <div className="bg-slate-950 border-2 border-red-500 rounded-xl px-3 py-1.5 text-center">
                <span className="block text-[8px] uppercase font-bold text-red-400">Blood</span>
                <span className="text-xl font-black text-red-500">{patientData.patient.blood_group}</span>
              </div>
            </div>

            {/* Critical Allergies */}
            <div className="bg-red-950/40 border-2 border-red-600 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span> CRITICAL ALLERGIES & ADVERSE REACTIONS
              </span>
              {patientData.allergies && patientData.allergies.length > 0 ? (
                <ul className="space-y-1">
                  {patientData.allergies.map((a, idx) => (
                    <li key={idx} className="text-xs font-bold text-red-200">
                      • {a.allergen} ({a.severity || "Severe"}) - {a.reaction_description || "Anaphylaxis risk"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-400">No known critical drug allergies</p>
              )}
            </div>

            {/* Current Medications */}
            {patientData.medications && patientData.medications.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Current Medications</span>
                <ul className="space-y-1">
                  {patientData.medications.map((m, idx) => (
                    <li key={idx} className="text-xs text-emerald-300 font-medium">
                      • {m.name} {m.dose} ({m.frequency || "Daily"})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vitals Telemetry */}
            {patientData.vitals && patientData.vitals.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Baseline Vitals</span>
                <div className="grid grid-cols-2 gap-2">
                  {patientData.vitals.map((v, idx) => (
                    <div key={idx} className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">{v.vital_type.replace("_", " ")}</span>
                      <span className="text-sm font-black text-teal-400">{v.value} {v.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contacts */}
            {patientData.contacts && patientData.contacts.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Emergency Relay</span>
                <div className="space-y-2">
                  {patientData.contacts.map((c, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl flex items-center justify-between border border-slate-800">
                      <div>
                        <div className="font-bold text-white text-xs">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.relationship}</div>
                      </div>
                      <a
                        href={`tel:${c.phone || c.phone_number}`}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg"
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
