"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface HospitalSession {
  id: string;
  hospital_id: string;
  name: string;
  registration_number: string;
  city: string;
  state: string;
}

interface StaffSession {
  doctor_id: string;
  doctor_name: string;
  department: string;
}

interface PatientSearchResponse {
  success: boolean;
  allowed: boolean;
  card_status: string;
  patient: {
    prana_id: string;
    full_name: string;
    date_of_birth: string;
    age: number;
    gender: string;
    blood_group: string;
    weight_kg?: number;
    height_cm?: number;
    emergency_relay?: string;
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
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    is_primary: boolean;
  }>;
}

export default function HospitalPortalPage() {
  // Hospital Login State
  const [hospitalSession, setHospitalSession] = useState<HospitalSession | null>(null);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [hospIdInput, setHospIdInput] = useState("HOSP-AIIMS-01");
  const [doctorNameInput, setDoctorNameInput] = useState("Dr. Aarav Mehta (Chief Trauma Surgeon)");
  const [departmentInput, setDepartmentInput] = useState("Trauma & Emergency Care");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Patient Search State
  const [searchPid, setSearchPid] = useState("PRAN-ba42c5c2");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [patientRecord, setPatientRecord] = useState<PatientSearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "clinical" | "vitals" | "history">("overview");

  // Audit badge
  const [auditSuccess, setAuditSuccess] = useState(false);

  // Restore login from localStorage
  useEffect(() => {
    try {
      const savedHosp = localStorage.getItem("prana_hosp_session");
      const savedStaff = localStorage.getItem("prana_staff_session");
      if (savedHosp && savedStaff) {
        setHospitalSession(JSON.parse(savedHosp));
        setStaffSession(JSON.parse(savedStaff));
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleHospitalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/hospital-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: hospIdInput.trim(),
          doctor_name: doctorNameInput.trim(),
          department: departmentInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Hospital authentication failed");
      }

      setHospitalSession(data.hospital);
      setStaffSession(data.staff);
      localStorage.setItem("prana_hosp_session", JSON.stringify(data.hospital));
      localStorage.setItem("prana_staff_session", JSON.stringify(data.staff));

      // Auto-load patient
      performPatientSearch(searchPid, data.hospital.hospital_id);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Hospital login error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleHospitalLogout = () => {
    setHospitalSession(null);
    setStaffSession(null);
    setPatientRecord(null);
    localStorage.removeItem("prana_hosp_session");
    localStorage.removeItem("prana_staff_session");
  };

  const performPatientSearch = async (pidToSearch: string, hospId?: string) => {
    if (!pidToSearch.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setAuditSuccess(false);

    try {
      const currentHospId = hospId || hospitalSession?.hospital_id || "HOSP-AIIMS-01";
      const res = await fetch(
        `/api/hospitals/search-patient?prana_id=${encodeURIComponent(pidToSearch.trim())}&hospital_id=${encodeURIComponent(currentHospId)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Patient not found or unauthorized");
      }

      setPatientRecord(data as PatientSearchResponse);
      setAuditSuccess(true);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Patient search failed");
      setPatientRecord(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-900/30 text-xl font-bold">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PRANA Hospital Clinical Network
                </span>
                <span className="text-[10px] bg-teal-950 border border-teal-700/60 text-teal-300 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Verified Facility Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inpatient & Emergency Patient Lookup System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital/paramedic"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 transition"
            >
              🚑 Paramedic App
            </Link>
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-purple-300 transition"
            >
              🛡️ Superadmin
            </Link>
            {hospitalSession && (
              <button
                onClick={handleHospitalLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 transition"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hospital Authentication & Search Controller */}
        <div className="lg:col-span-4 space-y-6">
          {/* Hospital Staff Login Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                Hospital Facility Accreditation
              </span>
              {hospitalSession ? (
                <span className="text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full">
                  VERIFIED & ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  LOGIN REQUIRED
                </span>
              )}
            </div>

            {!hospitalSession ? (
              <form onSubmit={handleHospitalLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Hospital Facility ID or Name
                  </label>
                  <input
                    type="text"
                    value={hospIdInput}
                    onChange={(e) => setHospIdInput(e.target.value)}
                    placeholder="e.g. HOSP-AIIMS-01"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-teal-300 outline-none"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try: <span className="text-teal-400 font-mono cursor-pointer" onClick={() => setHospIdInput("HOSP-AIIMS-01")}>HOSP-AIIMS-01</span>, <span className="text-teal-400 font-mono cursor-pointer" onClick={() => setHospIdInput("HOSP-MAX-02")}>HOSP-MAX-02</span>, or <span className="text-teal-400 font-mono cursor-pointer" onClick={() => setHospIdInput("HOSP-APOLLO-03")}>HOSP-APOLLO-03</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Attending Physician / Doctor Name
                  </label>
                  <input
                    type="text"
                    value={doctorNameInput}
                    onChange={(e) => setDoctorNameInput(e.target.value)}
                    placeholder="e.g. Dr. Aarav Mehta"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Clinical Department
                  </label>
                  <select
                    value={departmentInput}
                    onChange={(e) => setDepartmentInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="Trauma & Emergency Care">Trauma & Emergency Care</option>
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="Neurology">Neurology</option>
                  </select>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
                    ⚠️ {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg shadow-teal-900/40 disabled:opacity-50"
                >
                  {isLoggingIn ? "Verifying Accreditation..." : "Authenticate Hospital Workstation"}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-white text-base leading-tight">
                    {hospitalSession.name}
                  </div>
                  <div className="text-xs text-teal-400 font-mono">
                    Facility ID: {hospitalSession.hospital_id} • Reg: {hospitalSession.registration_number}
                  </div>
                  <div className="text-xs text-slate-400">
                    Location: {hospitalSession.city}, {hospitalSession.state}
                  </div>
                </div>

                {staffSession && (
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-1 text-xs">
                    <div className="text-slate-400">Logged-in Physician:</div>
                    <div className="font-bold text-teal-300 text-sm">{staffSession.doctor_name}</div>
                    <div className="text-slate-400">Department: <strong className="text-slate-200">{staffSession.department}</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Patient by PRANA Number */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>🔍</span> Search Patient by PRANA ID
              </h2>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                Smart Card ID
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Enter the patient&apos;s universal PRANA number to verify authorization and inspect their clinical history.
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchPid}
                  onChange={(e) => setSearchPid(e.target.value)}
                  placeholder="e.g. PRAN-ba42c5c2"
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 outline-none uppercase"
                />
                <button
                  onClick={() => performPatientSearch(searchPid)}
                  disabled={isSearching || !searchPid}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-sm transition"
                >
                  {isSearching ? "..." : "Search"}
                </button>
              </div>

              <div className="text-[11px] text-slate-500">
                Registered sample ID: <span className="text-teal-400 font-mono cursor-pointer font-bold" onClick={() => { setSearchPid("PRAN-ba42c5c2"); performPatientSearch("PRAN-ba42c5c2"); }}>PRAN-ba42c5c2</span>
              </div>
            </div>

            {searchError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300">
                ❌ {searchError}
              </div>
            )}

            {auditSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-[11px] text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Hospital clinical access recorded to central audit log.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Complete Patient Records & Permissions */}
        <div className="lg:col-span-8 space-y-6">
          {!patientRecord ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-3xl">
                🪪
              </div>
              <h3 className="text-lg font-bold text-white">No Patient Record Selected</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Authenticate your hospital workstation on the left and enter a patient PRANA number (e.g. <span className="font-mono text-teal-400">PRAN-ba42c5c2</span>) to inspect clinical records and verify treatment clearance.
              </p>
              <button
                onClick={() => performPatientSearch("PRAN-ba42c5c2")}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
              >
                Inspect Sample Patient (PRAN-ba42c5c2)
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Patient Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {patientRecord.patient.full_name}
                      </h1>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          patientRecord.allowed
                            ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400"
                            : "bg-red-950 border border-red-500/50 text-red-400"
                        }`}
                      >
                        {patientRecord.allowed ? "ACCESS PERMITTED (ACTIVE CARD)" : "CARD SUSPENDED BY USER"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>PRANA ID: <strong className="font-mono text-teal-400">{patientRecord.patient.prana_id}</strong></span>
                      <span>•</span>
                      <span>DOB: {patientRecord.patient.date_of_birth} ({patientRecord.patient.age} Yrs)</span>
                      <span>•</span>
                      <span>Gender: {patientRecord.patient.gender}</span>
                      <span>•</span>
                      <span>Weight: {patientRecord.patient.weight_kg || 68} kg</span>
                    </div>
                  </div>

                  {/* Blood Group Indicator */}
                  <div className="bg-slate-950 border-2 border-red-500/80 rounded-2xl px-5 py-3 text-center shadow-lg shadow-red-950/50">
                    <span className="block text-[10px] uppercase font-bold text-red-400 tracking-wider">Blood Group</span>
                    <span className="text-3xl font-black text-red-500">{patientRecord.patient.blood_group || "B+"}</span>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-800 pt-2 gap-2 text-xs font-bold overflow-x-auto">
                  {[
                    { id: "overview", label: "🚨 Critical Allergies & Contacts" },
                    { id: "clinical", label: "💊 Medications & Diagnoses" },
                    { id: "vitals", label: "📊 Vitals & Telemetry" },
                    { id: "history", label: "🏥 Surgeries & Implanted Devices" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-slate-800 text-teal-300 border-b-2 border-teal-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: ALLERGIES & EMERGENCY CONTACTS */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* Allergies Card */}
                  <div className="bg-red-950/40 border-2 border-red-600/70 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-red-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                        <span>⚠️</span> Critical Drug & Anaphylaxis Alerts
                      </h3>
                      <span className="text-xs bg-red-900/60 text-red-200 font-bold px-2 py-0.5 rounded-full">
                        HIGH ATTENTION
                      </span>
                    </div>

                    {patientRecord.allergies && patientRecord.allergies.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {patientRecord.allergies.map((allergy, idx) => (
                          <div key={idx} className="bg-slate-950/90 border border-red-900/60 rounded-xl p-3.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-bold text-sm">{allergy.allergen}</span>
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
                      <p className="text-xs text-emerald-400 bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40">
                        ✅ No critical drug or food allergies on record.
                      </p>
                    )}
                  </div>

                  {/* Emergency Contacts Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>📞</span> Next-of-Kin & Emergency Relay Contacts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientRecord.emergency_contacts && patientRecord.emergency_contacts.length > 0 ? (
                        patientRecord.emergency_contacts.map((contact, idx) => (
                          <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white text-sm">{contact.name}</div>
                              <div className="text-xs text-slate-400">
                                Relationship: <strong className="text-teal-400">{contact.relationship}</strong>
                              </div>
                            </div>
                            <a
                              href={`tel:${contact.phone}`}
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

              {/* TAB 2: MEDICATIONS & CONDITIONS */}
              {activeTab === "clinical" && (
                <div className="space-y-5">
                  {/* Medications */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>💊</span> Current Medication Regimen
                    </h3>
                    {patientRecord.medications && patientRecord.medications.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientRecord.medications.map((med, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-400 text-sm">{med.name}</span>
                              <span className="text-xs font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">{med.dose}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span>Freq: {med.frequency || "Daily"}</span>
                              {med.prescribed_by && <span>Prescribed by: {med.prescribed_by}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No active medications recorded.</p>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>🩺</span> Active Diagnoses & Chronic Illnesses
                    </h3>
                    {patientRecord.conditions && patientRecord.conditions.length > 0 ? (
                      <div className="space-y-2">
                        {patientRecord.conditions.map((cond, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-sm">{cond.name}</span>
                              <p className="text-[11px] text-slate-400">
                                Status: <strong className="text-amber-400 capitalize">{cond.status || "Active"}</strong>
                                {cond.treating_doctor && ` • Treating Doctor: ${cond.treating_doctor}`}
                              </p>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg">
                              Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No chronic diagnoses reported.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VITALS */}
              {activeTab === "vitals" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>📊</span> Patient Baseline Physiological Telemetry
                  </h3>
                  {patientRecord.vitals && patientRecord.vitals.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {patientRecord.vitals.map((v, idx) => (
                        <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {v.vital_type.replace("_", " ")}
                          </span>
                          <div className="text-2xl font-black text-teal-400">
                            {v.value} <span className="text-xs font-normal text-slate-400">{v.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No vitals stored for this patient.</p>
                  )}
                </div>
              )}

              {/* TAB 4: SURGERIES & DEVICES */}
              {activeTab === "history" && (
                <div className="space-y-5">
                  {/* Devices */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>⚡</span> Implanted Devices & Prosthetics
                    </h3>
                    {patientRecord.devices && patientRecord.devices.length > 0 ? (
                      <div className="space-y-2">
                        {patientRecord.devices.map((dev, idx) => (
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

                  {/* Surgeries */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>🏥</span> Operative & Surgical History
                    </h3>
                    {patientRecord.surgeries && patientRecord.surgeries.length > 0 ? (
                      <div className="space-y-2">
                        {patientRecord.surgeries.map((surg, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-sm">{surg.procedure || surg.surgery_name}</span>
                              <p className="text-[11px] text-slate-400">
                                {surg.surgery_date && `Date: ${surg.surgery_date} • `}
                                {surg.hospital_name || "Hospital Facility"}
                              </p>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                              Documented
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
