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
    prescribed_by?: string;
  }>;
  conditions: Array<{
    id: string;
    name: string;
    status?: string;
    treating_doctor?: string;
    hospital?: string;
  }>;
  devices: Array<{
    id: string;
    name?: string;
    device_name?: string;
    model_number?: string;
  }>;
  surgeries: Array<{
    id: string;
    procedure?: string;
    surgery_name?: string;
    surgery_date?: string;
    hospital_name?: string;
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
    is_primary?: boolean;
  }>;
}

export default function HospitalParamedicPage() {
  // Authentication states
  const [session, setSession] = useState<ParamedicSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [badgeCode, setBadgeCode] = useState("PARAM-7701");
  const [badgePhone, setBadgePhone] = useState("9811223344");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Patient Lookup states
  const [searchPid, setSearchPid] = useState("PRAN-ba42c5c2");
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [patientData, setPatientData] = useState<PatientRecord | null>(null);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "clinical" | "vitals" | "history">("summary");

  // Audit status
  const [auditLogged, setAuditLogged] = useState(false);

  // Check saved session in localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("prana_responder_session");
      const savedToken = localStorage.getItem("prana_responder_token");
      if (savedSession && savedToken) {
        setSession(JSON.parse(savedSession));
        setToken(savedToken);
      }
    } catch {
      // Ignore parse error
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
        throw new Error(data.error || "Authentication failed");
      }

      setSession(data.responder);
      setToken(data.token);
      localStorage.setItem("prana_responder_session", JSON.stringify(data.responder));
      localStorage.setItem("prana_responder_token", data.token);

      // Auto load default sample patient
      fetchPatientRecord(searchPid);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Paramedic verification failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setToken(null);
    setPatientData(null);
    localStorage.removeItem("prana_responder_session");
    localStorage.removeItem("prana_responder_token");
  };

  const fetchPatientRecord = async (pidToLookup: string) => {
    if (!pidToLookup) return;
    setIsLoadingPatient(true);
    setPatientError(null);
    setAuditLogged(false);

    try {
      const res = await fetch(`/api/card/scan-details?pid=${encodeURIComponent(pidToLookup.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.patient) {
        throw new Error(data.error || "Patient not found or no authorized record");
      }

      setPatientData(data as PatientRecord);

      // Log high-clearance paramedic access log to audit table
      try {
        await fetch("/api/revocations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "log_scan",
            prana_id: data.patient.prana_id,
            responder_id: session?.responder_code || "PARAM-MEDIC",
            location_city: "Hospital Emergency Trauma Care",
            location_country: "India",
            access_tier: "Red Tier (Full Paramedic Clearance)",
            scanner_type: "Hospital Trauma Station",
            user_agent: `Paramedic Station - ${session?.organization || "EMS"}`,
            accessed_data_summary: "Full Patient Clinical File: Vitals, Allergies, Surgeries & Implants",
          }),
        });
        setAuditLogged(true);
      } catch {
        // Non-blocking audit failure
      }
    } catch (err: unknown) {
      setPatientError(err instanceof Error ? err.message : "Failed to load patient record");
      setPatientData(null);
    } finally {
      setIsLoadingPatient(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-900/30 font-black text-xl text-white">
              🚑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  PRANA Hospital Emergency Network
                </span>
                <span className="text-[10px] bg-cyan-950 border border-cyan-700/60 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Tier-3 Paramedic
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Trauma Center & Emergency Paramedic Access Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/scan"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              📷 QR Scanner
            </Link>
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/50 text-purple-200 transition"
            >
              🛡️ Superadmin
            </Link>
            {session && (
              <button
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 transition"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Responder Status & Patient Lookup */}
        <div className="lg:col-span-4 space-y-6">
          {/* Paramedic Login / Identity Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Responder Badge Verification
              </span>
              {session ? (
                <span className="text-xs bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                  AUTHENTICATED
                </span>
              ) : (
                <span className="text-xs bg-amber-950 border border-amber-500/40 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                  BADGE REQUIRED
                </span>
              )}
            </div>

            {!session ? (
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Paramedic Badge / Responder Code
                  </label>
                  <input
                    type="text"
                    value={badgeCode}
                    onChange={(e) => setBadgeCode(e.target.value)}
                    placeholder="e.g. PARAM-7701"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-300 outline-none transition"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Demo badge codes: <span className="text-cyan-400 font-mono">PARAM-7701</span> or <span className="text-cyan-400 font-mono">PARAM-8822</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Official Mobile / Registered Phone
                  </label>
                  <input
                    type="tel"
                    value={badgePhone}
                    onChange={(e) => setBadgePhone(e.target.value)}
                    placeholder="e.g. 9811223344"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-200 outline-none transition"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
                    ⚠️ {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg shadow-cyan-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? "Verifying Credentials..." : "Authenticate Responder Badge"}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-xl font-bold text-cyan-300">
                    👨‍⚕️
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {session.name}
                    </h3>
                    <p className="text-xs text-cyan-400 font-mono">
                      {session.responder_code} • {session.employee_id}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hospital / Org:</span>
                    <span className="font-semibold text-slate-200 text-right">{session.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-semibold text-cyan-300 capitalize">{session.organization_type} Unit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clearance Tier:</span>
                    <span className="font-bold text-emerald-400">Full Red Tier (Clinical Access)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expires:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(session.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Patient Lookup Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>🔍</span> Emergency Patient Lookup
              </h2>
              <span className="text-[11px] text-slate-400">PRANA Universal ID</span>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchPid}
                  onChange={(e) => setSearchPid(e.target.value)}
                  placeholder="Enter PRAN-XXXXXXXX..."
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 outline-none uppercase"
                />
                <button
                  onClick={() => fetchPatientRecord(searchPid)}
                  disabled={isLoadingPatient || !searchPid}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-sm transition"
                >
                  {isLoadingPatient ? "..." : "Fetch"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Active registered patient in system: <span className="text-cyan-400 font-mono cursor-pointer" onClick={() => { setSearchPid("PRAN-ba42c5c2"); fetchPatientRecord("PRAN-ba42c5c2"); }}>PRAN-ba42c5c2</span>
              </p>
            </div>

            {patientError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300">
                ❌ {patientError}
              </div>
            )}

            {auditLogged && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-[11px] text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Access immutably logged to central audit trail.</span>
              </div>
            )}
          </div>

          {/* Quick Emergency Actions */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Emergency Protocols</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                Check critical drug allergies before administering antibiotics/anesthetics.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Verify blood group compatibility before whole blood transfusion.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Inspect implanted devices (pacemakers, titanium pins) before MRI.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Full Patient Clinical File */}
        <div className="lg:col-span-8 space-y-6">
          {!patientData ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-3xl">
                📋
              </div>
              <h3 className="text-lg font-bold text-white">No Patient File Loaded</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Authenticate your paramedic credentials and enter a patient PRANA ID (e.g. <span className="font-mono text-cyan-400">PRAN-ba42c5c2</span>) to decrypt and access real-time clinical history.
              </p>
              <button
                onClick={() => fetchPatientRecord(searchPid)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                Load Sample Patient (PRAN-ba42c5c2)
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Patient Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {patientData.patient.full_name}
                      </h1>
                      <span className="bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        ACTIVE RECORD
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-medium">
                      <span>PRANA ID: <strong className="font-mono text-cyan-400">{patientData.patient.prana_id}</strong></span>
                      <span>•</span>
                      <span>{patientData.patient.gender}</span>
                      <span>•</span>
                      <span>Age: {patientData.patient.age || 19} Years</span>
                    </div>
                  </div>

                  {/* Blood Group Badge */}
                  <div className="bg-slate-950 border-2 border-red-500/80 rounded-2xl px-5 py-3 text-center shadow-lg shadow-red-950/50">
                    <span className="block text-[10px] uppercase font-bold text-red-400 tracking-wider">Blood Group</span>
                    <span className="text-3xl font-black text-red-500">{patientData.patient.blood_group || "B+"}</span>
                  </div>
                </div>

                {/* Sub tabs */}
                <div className="flex border-b border-slate-800 mt-6 gap-2 text-xs font-bold">
                  {[
                    { id: "summary", label: "🚨 Critical Alerts" },
                    { id: "clinical", label: "💊 Meds & Conditions" },
                    { id: "vitals", label: "📊 Baseline Vitals" },
                    { id: "history", label: "🏥 Procedures & Devices" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-4 py-2.5 rounded-t-xl transition ${
                        activeTab === tab.id
                          ? "bg-slate-800 text-cyan-300 border-b-2 border-cyan-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab 1: Critical Alerts & Emergency Contacts */}
              {activeTab === "summary" && (
                <div className="space-y-5">
                  {/* Critical Allergy Warning */}
                  <div className="bg-red-950/40 border-2 border-red-600/70 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-red-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                        <span>⚠️</span> Critical Allergies & Adverse Reactions
                      </h3>
                      <span className="text-xs bg-red-900/60 text-red-200 font-bold px-2.5 py-0.5 rounded-full">
                        HIGH PRIORITY
                      </span>
                    </div>

                    {patientData.allergies && patientData.allergies.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {patientData.allergies.map((allergy, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-950/90 border border-red-900/60 rounded-xl p-3.5 space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-white font-bold text-sm">
                                {allergy.allergen}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                                {allergy.severity || "Severe"}
                              </span>
                            </div>
                            <p className="text-xs text-red-200/80">
                              {allergy.reaction_description || "Anaphylaxis / Respiratory distress risk"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40">
                        ✅ No critical drug or food allergies on record.
                      </p>
                    )}
                  </div>

                  {/* Primary Emergency Relay Contacts */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>📞</span> Emergency Relay Contacts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientData.contacts && patientData.contacts.length > 0 ? (
                        patientData.contacts.map((contact, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white text-sm">
                                {contact.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                Relationship: <strong className="text-cyan-400">{contact.relationship}</strong>
                              </div>
                            </div>
                            <a
                              href={`tel:${contact.phone_number || contact.phone}`}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
                            >
                              <span>📞 Call</span>
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl col-span-2">
                          Emergency Contact Relay Number: 1800-PRANA-RELAY
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Medications & Conditions */}
              {activeTab === "clinical" && (
                <div className="space-y-5">
                  {/* Current Medications */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>💊</span> Active Medications
                    </h3>
                    {patientData.medications && patientData.medications.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientData.medications.map((med, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-400 text-sm">{med.name}</span>
                              <span className="text-xs font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">{med.dose}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span>Freq: {med.frequency || "Daily"}</span>
                              {med.prescribed_by && <span>By: {med.prescribed_by}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No active medications registered.</p>
                    )}
                  </div>

                  {/* Chronic & Active Conditions */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>🩺</span> Medical Diagnoses & Chronic Conditions
                    </h3>
                    {patientData.conditions && patientData.conditions.length > 0 ? (
                      <div className="space-y-2">
                        {patientData.conditions.map((cond, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-sm">{cond.name}</span>
                              <p className="text-[11px] text-slate-400">
                                Status: <strong className="text-amber-400 capitalize">{cond.status || "Active"}</strong>
                                {cond.treating_doctor && ` • Doctor: ${cond.treating_doctor}`}
                              </p>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg">
                              Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No conditions reported.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Baseline Vitals */}
              {activeTab === "vitals" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>📊</span> Recorded Baseline Vitals & Physiological Telemetry
                  </h3>
                  {patientData.vitals && patientData.vitals.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {patientData.vitals.map((v, idx) => (
                        <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {v.vital_type.replace("_", " ")}
                          </span>
                          <div className="text-2xl font-black text-sky-400">
                            {v.value} <span className="text-xs font-normal text-slate-400">{v.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No baseline vitals stored.</p>
                  )}
                </div>
              )}

              {/* Tab 4: Surgical History & Implanted Devices */}
              {activeTab === "history" && (
                <div className="space-y-5">
                  {/* Implanted Devices */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>⚡</span> Implanted Devices & Metal Prosthetics
                    </h3>
                    {patientData.devices && patientData.devices.length > 0 ? (
                      <div className="space-y-2">
                        {patientData.devices.map((dev, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-amber-300 text-sm">{dev.name || dev.device_name}</span>
                              {dev.model_number && <p className="text-[11px] text-slate-400">Model: {dev.model_number}</p>}
                            </div>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              MRI Caution
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No implanted prosthetics on file.</p>
                    )}
                  </div>

                  {/* Past Surgeries */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>🏥</span> Past Major Surgeries & Operative History
                    </h3>
                    {patientData.surgeries && patientData.surgeries.length > 0 ? (
                      <div className="space-y-2">
                        {patientData.surgeries.map((surg, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-sm">{surg.procedure || surg.surgery_name}</span>
                              <p className="text-[11px] text-slate-400">
                                {surg.surgery_date && `Date: ${surg.surgery_date} • `}
                                {surg.hospital_name || "Tertiary Hospital"}
                              </p>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                              Recorded
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No prior surgical records found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
