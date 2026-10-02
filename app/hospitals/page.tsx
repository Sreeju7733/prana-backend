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
  role: string;
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

export default function HospitalEHRDashboard() {
  // Session states
  const [hospitalSession, setHospitalSession] = useState<HospitalSession | null>({
    id: "hosp-1",
    hospital_id: "HOSP-AIIMS-01",
    name: "AIIMS New Delhi - Trauma & Emergency Center",
    registration_number: "REG-AIIMS-2024-001",
    city: "New Delhi",
    state: "Delhi",
  });
  const [staffSession, setStaffSession] = useState<StaffSession | null>({
    doctor_id: "DOC-9081",
    doctor_name: "Dr. Arvind Swaminathan, MD",
    department: "Emergency Medicine & Trauma Resuscitation",
    role: "Attending Emergency Physician",
  });

  const [showSwitchFacility, setShowSwitchFacility] = useState(false);
  const [facilitySelect, setFacilitySelect] = useState("HOSP-AIIMS-01");
  const [docNameInput, setDocNameInput] = useState("Dr. Arvind Swaminathan, MD");

  // Patient Search
  const [searchQuery, setSearchQuery] = useState("PRAN-ba42c5c2");
  const [isSearching, setIsSearching] = useState(false);
  const [patientData, setPatientData] = useState<PatientSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active EHR Clinical Tab
  const [clinicalTab, setClinicalTab] = useState<"triage" | "allergies" | "medications" | "history" | "vitals" | "audit">("triage");

  // Bed & Department stats
  const [quickStats] = useState({
    erOccupancy: "92%",
    resusBedsAvailable: 3,
    traumaCasesToday: 18,
    bloodBankOpos: "14 Units",
  });

  // Recent looked up patients history in current session
  const [recentLookups, setRecentLookups] = useState<Array<{ pid: string; name: string; time: string; status: string }>>([
    { pid: "PRAN-ba42c5c2", name: "Sreeju S", time: "Just now", status: "Active (Clear)" },
    { pid: "PRAN-9921D8A2", name: "Kavita Ramachandran", time: "18m ago", status: "Active (Severe Allergy)" },
    { pid: "PRAN-4410A1B0", name: "Rohan Varma", time: "1h 10m ago", status: "Suspended" },
  ]);

  const performSearch = async (pid: string) => {
    if (!pid.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/hospitals/search-patient?prana_id=${encodeURIComponent(pid.trim())}&hospital_id=${hospitalSession?.hospital_id || "HOSP-AIIMS-01"}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No patient file found with this PRANA ID");
      }

      setPatientData(data as PatientSearchResponse);

      // Add to recent lookups if not present
      if (!recentLookups.some(r => r.pid === data.patient.prana_id)) {
        setRecentLookups(prev => [
          { pid: data.patient.prana_id, name: data.patient.full_name, time: "Just now", status: data.allowed ? "Active (Clear)" : "Suspended" },
          ...prev.slice(0, 4)
        ]);
      }
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Failed to retrieve clinical file");
      setPatientData(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    performSearch("PRAN-ba42c5c2");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* Enterprise Hospital Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Hospital Branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-teal-900/30">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PRANA • Clinical EHR & Trauma Portal
                </span>
                <span className="text-[10px] bg-teal-950 border border-teal-500/50 text-teal-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Level 1 Trauma Center
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {hospitalSession?.name} • <span className="text-teal-400 font-mono">{hospitalSession?.hospital_id}</span>
              </p>
            </div>
          </div>

          {/* Quick Realtime ER Stats Pill */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">ER Load</span>
              <span className="font-bold text-amber-400">{quickStats.erOccupancy}</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Resus Beds</span>
              <span className="font-bold text-emerald-400">{quickStats.resusBedsAvailable} Open</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Blood Bank O+</span>
              <span className="font-bold text-red-400">{quickStats.bloodBankOpos}</span>
            </div>
          </div>

          {/* Attending Physician Profile & System Links */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white">{staffSession?.doctor_name}</span>
              <span className="text-[10px] text-teal-400 font-mono">{staffSession?.role}</span>
            </div>
            <button
              onClick={() => setShowSwitchFacility(!showSwitchFacility)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>⚙️ Facility</span>
            </button>
            <Link
              href="/admin"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 transition"
            >
              Superadmin
            </Link>
          </div>
        </div>

        {/* Facility Switcher Modal Dropdown */}
        {showSwitchFacility && (
          <div className="bg-slate-900 border-b border-slate-800 p-4 px-6 flex flex-wrap items-center justify-between gap-4 animate-fade-in text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-300">Active Hospital:</span>
              <select
                value={facilitySelect}
                onChange={(e) => setFacilitySelect(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-teal-300 font-mono outline-none"
              >
                <option value="HOSP-AIIMS-01">AIIMS New Delhi - Trauma & Emergency Center</option>
                <option value="HOSP-MAX-02">Max Super Speciality Hospital Saket</option>
                <option value="HOSP-APOLLO-03">Indraprastha Apollo Hospitals</option>
                <option value="HOSP-FORTIS-04">Fortis Memorial Research Institute</option>
              </select>

              <span className="font-bold text-slate-300 ml-2">Duty Physician:</span>
              <input
                type="text"
                value={docNameInput}
                onChange={(e) => setDocNameInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none w-56"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHospitalSession(prev => prev ? { ...prev, hospital_id: facilitySelect, name: facilitySelect.includes("AIIMS") ? "AIIMS New Delhi - Trauma Center" : facilitySelect.includes("MAX") ? "Max Super Speciality Saket" : "Apollo Hospitals" } : null);
                  setStaffSession(prev => prev ? { ...prev, doctor_name: docNameInput } : null);
                  setShowSwitchFacility(false);
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-1.5 rounded-lg transition"
              >
                Apply Facility Credentials
              </button>
              <button
                onClick={() => setShowSwitchFacility(false)}
                className="bg-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workstation Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Universal Patient Search & Emergency Intake (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Smart Card & PRANA ID Intake */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>⚡</span> Patient Admission & PRANA Search
              </h2>
              <span className="text-[10px] font-mono bg-teal-950 text-teal-400 border border-teal-800/80 px-2 py-0.5 rounded font-bold">
                EHR SYNC
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Universal PRANA Card Identifier
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. PRAN-ba42c5c2"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-teal-300 uppercase outline-none"
                    />
                  </div>
                  <button
                    onClick={() => performSearch(searchQuery)}
                    disabled={isSearching || !searchQuery}
                    className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-sm transition flex items-center gap-1.5 shadow"
                  >
                    {isSearching ? "Searching..." : "Inspect"}
                  </button>
                </div>
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                  <span>❌</span>
                  <div>{searchError}</div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Sample Patient ID:</span>
                <span
                  onClick={() => { setSearchQuery("PRAN-ba42c5c2"); performSearch("PRAN-ba42c5c2"); }}
                  className="font-mono text-teal-400 font-bold hover:underline cursor-pointer"
                >
                  PRAN-ba42c5c2
                </span>
              </div>
            </div>

            {/* Hardware & Hardware scanner quick trigger */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Emergency Smart Scanner:</span>
              <Link
                href="/scan"
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <span>📷 Open Camera Scanner →</span>
              </Link>
            </div>
          </div>

          {/* Recent Emergency Admissions in this Shift */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>🕒</span> Recent Ward Lookups
              </h3>
              <span className="text-[10px] text-slate-500">Current Duty Shift</span>
            </div>

            <div className="divide-y divide-slate-800">
              {recentLookups.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => { setSearchQuery(r.pid); performSearch(r.pid); }}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 p-2 rounded-xl transition"
                >
                  <div>
                    <div className="font-bold text-white text-xs">{r.name}</div>
                    <span className="font-mono text-[10px] text-teal-400">{r.pid}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status.includes("Severe") ? "bg-red-950 text-red-300 border border-red-800" :
                      r.status.includes("Suspended") ? "bg-amber-950 text-amber-300 border border-amber-800" :
                      "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    }`}>
                      {r.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">{r.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Hospital Protocol Guidelines */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Hospital Trauma Guidelines</h4>
            <div className="space-y-1.5 text-slate-400 text-[11px]">
              <div className="flex items-start gap-1.5">
                <span className="text-red-400 font-bold">1.</span>
                <span>Prioritize verification of <strong>Severe Anaphylactic Allergies</strong> prior to antibiotic or IV contrast push.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">2.</span>
                <span>Check for <strong>Implanted Devices</strong> (e.g. pacemakers, neurostimulators) before ordering emergent MRI.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-teal-400 font-bold">3.</span>
                <span>All lookups generate an encrypted signature and are immutably logged for clinical audit.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Interactive Electronic Health Record (EHR) (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!patientData ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-3xl">
                🪪
              </div>
              <h3 className="text-lg font-bold text-white">No Clinical Record Selected</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Scan a patient&apos;s physical PRANA card or search by their universal PRANA number to view real-time electronic health records, active medications, critical allergies, and baseline telemetry.
              </p>
              <button
                onClick={() => performSearch("PRAN-ba42c5c2")}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
              >
                Inspect Sample Patient (PRAN-ba42c5c2)
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Patient Banner: Clinical Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {patientData.patient.full_name}
                      </h1>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          patientData.allowed
                            ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400"
                            : "bg-red-950 border border-red-500/50 text-red-400"
                        }`}
                      >
                        {patientData.allowed ? "ACCESS PERMITTED (ACTIVE CARD)" : "CARD SUSPENDED BY USER"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                      <span>PRANA ID: <strong className="font-mono text-teal-400">{patientData.patient.prana_id}</strong></span>
                      <span>•</span>
                      <span>DOB: {patientData.patient.date_of_birth} ({patientData.patient.age} Yrs)</span>
                      <span>•</span>
                      <span>Gender: {patientData.patient.gender}</span>
                      <span>•</span>
                      <span>Weight: {patientData.patient.weight_kg || 68} kg</span>
                      <span>•</span>
                      <span>Height: {patientData.patient.height_cm || 175} cm</span>
                    </div>
                  </div>

                  {/* Blood Group Badge */}
                  <div className="bg-slate-950 border-2 border-red-500/80 rounded-2xl px-6 py-3 text-center shadow-lg shadow-red-950/50">
                    <span className="block text-[10px] uppercase font-bold text-red-400 tracking-wider">Blood Group</span>
                    <span className="text-3xl font-black text-red-500">{patientData.patient.blood_group}</span>
                  </div>
                </div>

                {/* Clinical Tabs Navigation */}
                <div className="flex border-b border-slate-800 pt-6 gap-2 text-xs font-bold overflow-x-auto">
                  {[
                    { id: "triage", label: "🚨 Emergency Triage & Allergies" },
                    { id: "medications", label: "💊 Medications & Prescriptions" },
                    { id: "vitals", label: "📊 Baseline Vitals & Labs" },
                    { id: "history", label: "🏥 Surgical History & Implants" },
                    { id: "audit", label: "📜 Access Audit & Relay" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setClinicalTab(tab.id as typeof clinicalTab)}
                      className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap ${
                        clinicalTab === tab.id
                          ? "bg-slate-800 text-teal-300 border-b-2 border-teal-400 shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: EMERGENCY TRIAGE & ALLERGIES */}
              {clinicalTab === "triage" && (
                <div className="space-y-5">
                  {/* Critical Allergy Alert Panel */}
                  <div className="bg-red-950/40 border-2 border-red-600/70 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <h3 className="text-red-400 font-black text-sm uppercase tracking-wider">
                          Critical Allergic Reactions & Contraindications
                        </h3>
                      </div>
                      <span className="text-xs bg-red-900 text-red-200 font-black px-2.5 py-0.5 rounded-full uppercase">
                        High Priority Flag
                      </span>
                    </div>

                    {patientData.allergies && patientData.allergies.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {patientData.allergies.map((a, idx) => (
                          <div key={idx} className="bg-slate-950/90 border border-red-900/60 rounded-xl p-4 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-bold text-base">{a.allergen}</span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                                {a.severity || "Severe"}
                              </span>
                            </div>
                            <p className="text-xs text-red-200/90 leading-relaxed">
                              {a.reaction_description || "Anaphylaxis, airway compromise & hypotension risk"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-400 bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40">
                        ✅ No known severe drug allergies documented.
                      </p>
                    )}
                  </div>

                  {/* Diagnoses & Chronic Conditions */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>🩺</span> Chronic Medical Conditions & Diagnoses
                    </h3>
                    {patientData.conditions && patientData.conditions.length > 0 ? (
                      <div className="space-y-2">
                        {patientData.conditions.map((c, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white text-sm">{c.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Status: <strong className="text-amber-400 capitalize">{c.status || "Active"}</strong>
                                {c.treating_doctor && ` • Treating Doctor: ${c.treating_doctor}`}
                              </div>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg">
                              Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No active chronic conditions on file.</p>
                    )}
                  </div>

                  {/* Primary Next-of-Kin Emergency Contacts */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>📞</span> Next-of-Kin & Emergency Relay
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientData.emergency_contacts && patientData.emergency_contacts.length > 0 ? (
                        patientData.emergency_contacts.map((contact, idx) => (
                          <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white text-sm">{contact.name}</div>
                              <div className="text-xs text-slate-400">
                                Relationship: <strong className="text-teal-400">{contact.relationship}</strong>
                              </div>
                            </div>
                            <a
                              href={`tel:${contact.phone}`}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
                            >
                              <span>📞 Call</span>
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl col-span-2">
                          Universal Relay: 1800-PRANA-RELAY
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDICATIONS & REGIMEN */}
              {clinicalTab === "medications" && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <span>💊</span> Active Prescription Regimen
                      </h3>
                      <span className="text-xs text-teal-400 font-mono">
                        {patientData.medications?.length || 0} Registered Medicines
                      </span>
                    </div>

                    {patientData.medications && patientData.medications.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientData.medications.map((m, idx) => (
                          <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-emerald-400 text-base">{m.name}</span>
                              <span className="text-xs font-mono bg-slate-900 text-slate-200 px-2.5 py-1 rounded border border-slate-800 font-bold">
                                {m.dose}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 space-y-0.5">
                              <div>Frequency: <strong className="text-slate-200">{m.frequency || "Daily"}</strong></div>
                              {m.prescribed_by && <div>Prescribed by: <span className="text-teal-400">{m.prescribed_by}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No active medications registered.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VITALS TELEMETRY */}
              {clinicalTab === "vitals" && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>📊</span> Baseline Telemetry & Physiological Indicators
                    </h3>

                    {patientData.vitals && patientData.vitals.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                        {patientData.vitals.map((v, idx) => (
                          <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {v.vital_type.replace("_", " ")}
                            </span>
                            <div className="text-3xl font-black text-teal-400">
                              {v.value} <span className="text-xs font-normal text-slate-400">{v.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No vitals currently recorded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: SURGICAL HISTORY & DEVICES */}
              {clinicalTab === "history" && (
                <div className="space-y-5">
                  {/* Implanted Devices */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <span>⚡</span> Implanted Devices & Prosthetics
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                        MRI PROTOCOL CHECK
                      </span>
                    </div>

                    {patientData.devices && patientData.devices.length > 0 ? (
                      <div className="space-y-2">
                        {patientData.devices.map((d, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-amber-300 text-sm">{d.name || d.device_name}</div>
                              {d.model_number && <div className="text-xs text-slate-400">Model: {d.model_number}</div>}
                            </div>
                            <span className="text-xs font-bold text-amber-400 bg-amber-950 px-2.5 py-1 rounded border border-amber-800">
                              Magnetic Hazard Check
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No implanted prosthetics or devices documented.</p>
                    )}
                  </div>

                  {/* Past Surgeries */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>🏥</span> Operative & Surgical History
                    </h3>

                    {patientData.surgeries && patientData.surgeries.length > 0 ? (
                      <div className="space-y-2">
                        {patientData.surgeries.map((s, idx) => (
                          <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white text-sm">{s.procedure || s.surgery_name}</div>
                              <div className="text-xs text-slate-400">
                                {s.surgery_date && `Date: ${s.surgery_date} • `}
                                {s.hospital_name || "Tertiary Hospital"}
                              </div>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                              Documented
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl">No prior surgical history on record.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL */}
              {clinicalTab === "audit" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span>🛡️</span> Forensic Access & Security Chain
                  </h3>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-400">
                    <div className="flex justify-between">
                      <span>Accessing Facility:</span>
                      <strong className="text-white">{hospitalSession?.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Hospital Accreditation ID:</span>
                      <strong className="text-teal-400 font-mono">{hospitalSession?.hospital_id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attending Staff:</span>
                      <strong className="text-white">{staffSession?.doctor_name} ({staffSession?.doctor_id})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Security Clearance:</span>
                      <strong className="text-emerald-400">Red Tier (Full Clinical & Surgical Record)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Session Timestamp:</span>
                      <span className="font-mono text-slate-300">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
