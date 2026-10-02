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

export default function HospitalClinicalEHR() {
  // Sidenav navigation
  const [navSection, setNavSection] = useState<"patient_lookup" | "er_triage" | "ward_patients" | "facility_settings">("patient_lookup");

  // Facility & Session
  const [hospitalSession, setHospitalSession] = useState<HospitalSession>({
    id: "hosp-1",
    hospital_id: "HOSP-AIIMS-01",
    name: "AIIMS New Delhi - Trauma & Emergency Center",
    registration_number: "REG-AIIMS-2024-001",
    city: "New Delhi",
    state: "Delhi",
  });

  const [staffSession, setStaffSession] = useState<StaffSession>({
    doctor_id: "DOC-9081",
    doctor_name: "Dr. Arvind Swaminathan, MD",
    department: "Emergency Medicine & Trauma Resuscitation",
    role: "Attending Emergency Physician",
  });

  const [showSwitchFacility, setShowSwitchFacility] = useState(false);
  const [facilitySelect, setFacilitySelect] = useState("HOSP-AIIMS-01");
  const [doctorNameInput, setDoctorNameInput] = useState("Dr. Arvind Swaminathan, MD");

  // Patient Search & EHR
  const [searchPid, setSearchPid] = useState("PRAN-ba42c5c2");
  const [isSearching, setIsSearching] = useState(false);
  const [patientData, setPatientData] = useState<PatientSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Clinical Tab
  const [clinicalTab, setClinicalTab] = useState<"triage" | "medications" | "vitals" | "history" | "audit">("triage");

  // Department quick metrics
  const erMetrics = {
    occupancy: "88%",
    openBeds: 4,
    traumaCases: 19,
    bloodBankUnits: "14 Units",
  };

  const recentPatients = [
    { pid: "PRAN-ba42c5c2", name: "Sreeju S", age: 19, blood: "B+", status: "Active (Clear)" },
    { pid: "PRAN-9921D8A2", name: "Kavita Ramachandran", age: 34, blood: "O+", status: "Active (Allergy Alert)" },
    { pid: "PRAN-4410A1B0", name: "Rohan Varma", age: 48, blood: "A+", status: "Suspended" },
  ];

  const performSearch = async (pid: string) => {
    if (!pid.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/hospitals/search-patient?prana_id=${encodeURIComponent(pid.trim())}&hospital_id=${encodeURIComponent(hospitalSession.hospital_id)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No patient file found with this PRANA ID");
      }

      setPatientData(data as PatientSearchResponse);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-teal-600 selection:text-white antialiased">
      {/* ─── LEFT COLLAPSIBLE SIDENAV ─── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Hospital Logo Header */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              🏥
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm tracking-tight text-slate-900">PRANA Health</div>
              <div className="text-[11px] text-teal-700 font-semibold uppercase tracking-wider">Hospital Clinical EHR</div>
            </div>
          </div>

          {/* Current Facility Badge */}
          <div className="p-4 mx-3 my-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Facility</div>
            <div className="font-bold text-xs text-slate-800 truncate mt-0.5">{hospitalSession.name}</div>
            <div className="text-[11px] font-mono text-teal-700 mt-0.5 font-medium">{hospitalSession.hospital_id}</div>
            <button
              onClick={() => setShowSwitchFacility(!showSwitchFacility)}
              className="mt-2 text-[11px] font-bold text-teal-700 hover:text-teal-800 underline block"
            >
              Switch facility / staff →
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            <button
              onClick={() => setNavSection("patient_lookup")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "patient_lookup"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">🪪</span>
              <span>Patient PRANA Search</span>
            </button>

            <button
              onClick={() => setNavSection("er_triage")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "er_triage"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">🚨</span>
              <span>Emergency Triage Ward</span>
            </button>

            <button
              onClick={() => setNavSection("ward_patients")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "ward_patients"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">📋</span>
              <span>Shift Admissions</span>
            </button>

            <button
              onClick={() => setNavSection("facility_settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "facility_settings"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">⚙️</span>
              <span>Facility Information</span>
            </button>
          </nav>
        </div>

        {/* Sidenav Footer & Links */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              Dr
            </div>
            <div className="text-xs truncate">
              <div className="font-bold text-slate-800 truncate">{staffSession.doctor_name}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{staffSession.doctor_id}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <Link href="/paramedic" className="text-slate-600 hover:text-teal-700">
              🚑 Paramedic
            </Link>
            <Link href="/admin" className="text-slate-600 hover:text-teal-700">
              🛡️ Admin
            </Link>
            <Link href="/scan" className="text-slate-600 hover:text-teal-700">
              📷 QR
            </Link>
          </div>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-800">
              {hospitalSession.name}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-500 font-medium">
              {staffSession.department}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-4 text-slate-600">
              <span>ER Load: <strong className="text-amber-700">{erMetrics.occupancy}</strong></span>
              <span>Resus Beds: <strong className="text-emerald-700">{erMetrics.openBeds} Open</strong></span>
              <span>Blood O+: <strong className="text-red-700">{erMetrics.bloodBankUnits}</strong></span>
            </div>
            <div className="h-5 w-px bg-slate-200"></div>
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            >
              Superadmin Portal
            </Link>
          </div>
        </header>

        {/* Facility Credentials Switcher */}
        {showSwitchFacility && (
          <div className="bg-white border-b border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700">Select Accredited Hospital:</span>
              <select
                value={facilitySelect}
                onChange={(e) => setFacilitySelect(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="HOSP-AIIMS-01">AIIMS New Delhi - Trauma & Emergency Center</option>
                <option value="HOSP-MAX-02">Max Super Speciality Hospital Saket</option>
                <option value="HOSP-APOLLO-03">Indraprastha Apollo Hospitals</option>
                <option value="HOSP-FORTIS-04">Fortis Memorial Research Institute</option>
              </select>

              <span className="font-bold text-slate-700 ml-2">Duty Physician:</span>
              <input
                type="text"
                value={doctorNameInput}
                onChange={(e) => setDoctorNameInput(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 outline-none focus:ring-1 focus:ring-teal-600 w-60"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHospitalSession({
                    ...hospitalSession,
                    hospital_id: facilitySelect,
                    name: facilitySelect.includes("AIIMS") ? "AIIMS New Delhi - Trauma & Emergency Center" :
                          facilitySelect.includes("MAX") ? "Max Super Speciality Hospital Saket" :
                          facilitySelect.includes("APOLLO") ? "Indraprastha Apollo Hospitals" : "Fortis Memorial Research Institute"
                  });
                  setStaffSession({ ...staffSession, doctor_name: doctorNameInput });
                  setShowSwitchFacility(false);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
              >
                Apply
              </button>
              <button
                onClick={() => setShowSwitchFacility(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* SEARCH & INTAKE BAR */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Patient Search & Emergency Clearance</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect patient record, check card authorization status, and verify critical allergies.
                </p>
              </div>

              {/* Search Form */}
              <div className="flex gap-2 sm:w-96">
                <input
                  type="text"
                  value={searchPid}
                  onChange={(e) => setSearchPid(e.target.value)}
                  placeholder="Enter PRANA ID (e.g. PRAN-ba42c5c2)"
                  className="flex-1 bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-900 outline-none uppercase"
                />
                <button
                  onClick={() => performSearch(searchPid)}
                  disabled={isSearching || !searchPid}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold px-4 rounded-lg text-xs transition shadow-xs"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {searchError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {searchError}
              </div>
            )}
          </div>

          {/* EHR PATIENT DISPLAY */}
          {patientData ? (
            <div className="space-y-6">
              {/* Patient Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{patientData.patient.full_name}</h2>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        patientData.allowed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {patientData.allowed ? "Access Permitted (Active Card)" : "Card Suspended"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                      <span>PRANA ID: <strong className="font-mono text-slate-800">{patientData.patient.prana_id}</strong></span>
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

                  {/* Blood Group Box */}
                  <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-center">
                    <span className="block text-[10px] uppercase font-bold text-red-600 tracking-wider">Blood Group</span>
                    <span className="text-2xl font-black text-red-700">{patientData.patient.blood_group}</span>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex border-b border-slate-100 pt-4 gap-2 text-xs font-semibold overflow-x-auto">
                  {[
                    { id: "triage", label: "🚨 Emergency Triage & Allergies" },
                    { id: "medications", label: "💊 Current Medications" },
                    { id: "vitals", label: "📊 Baseline Vitals" },
                    { id: "history", label: "🏥 Surgical & Implants" },
                    { id: "audit", label: "📜 Forensic Access Chain" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setClinicalTab(tab.id as typeof clinicalTab)}
                      className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap ${
                        clinicalTab === tab.id
                          ? "text-teal-700 border-b-2 border-teal-600 font-bold bg-teal-50/50"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: ALLERGIES & TRIAGE */}
              {clinicalTab === "triage" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Critical Allergies */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span className="text-red-600">⚠️</span> Critical Drug & Anaphylaxis Alerts
                      </h3>
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        High Attention
                      </span>
                    </div>

                    {patientData.allergies && patientData.allergies.length > 0 ? (
                      <div className="space-y-3">
                        {patientData.allergies.map((a, idx) => (
                          <div key={idx} className="p-3.5 bg-red-50/60 border border-red-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900 text-sm">{a.allergen}</span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                                {a.severity || "Severe"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              {a.reaction_description || "Anaphylaxis & acute airway risk"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg">No critical drug allergies recorded.</p>
                    )}
                  </div>

                  {/* Chronic Conditions */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>🩺</span> Active Diagnoses & Chronic Illnesses
                    </h3>

                    {patientData.conditions && patientData.conditions.length > 0 ? (
                      <div className="space-y-2.5">
                        {patientData.conditions.map((c, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                            <div>
                              <div className="font-bold text-slate-800 text-xs">{c.name}</div>
                              <div className="text-[11px] text-slate-500">
                                Status: <strong className="text-slate-700 capitalize">{c.status || "Active"}</strong>
                                {c.treating_doctor && ` • Doctor: ${c.treating_doctor}`}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg">No chronic conditions registered.</p>
                    )}
                  </div>

                  {/* Emergency Contacts */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 lg:col-span-2 shadow-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>📞</span> Next-of-Kin Emergency Contacts
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientData.emergency_contacts && patientData.emergency_contacts.length > 0 ? (
                        patientData.emergency_contacts.map((contact, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                            <div>
                              <div className="font-bold text-slate-800 text-xs">{contact.name}</div>
                              <div className="text-[11px] text-slate-500">Relationship: <strong>{contact.relationship}</strong></div>
                            </div>
                            <a
                              href={`tel:${contact.phone}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                            >
                              📞 Call Contact
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg col-span-2">
                          Emergency Contact Relay: 1800-PRANA-RELAY
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDICATIONS */}
              {clinicalTab === "medications" && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Active Prescriptions & Dosages
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">{patientData.medications.length} Medications</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {patientData.medications.map((m, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                          <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            {m.dose}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          <div>Frequency: <strong className="text-slate-700">{m.frequency || "Daily"}</strong></div>
                          {m.prescribed_by && <div>Prescribed By: <strong>{m.prescribed_by}</strong></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: VITALS */}
              {clinicalTab === "vitals" && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Baseline Physiological Telemetry
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {patientData.vitals.map((v, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1">
                        <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          {v.vital_type.replace("_", " ")}
                        </span>
                        <div className="text-2xl font-black text-teal-800">
                          {v.value} <span className="text-xs font-normal text-slate-500">{v.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SURGERY & DEVICES */}
              {clinicalTab === "history" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Devices */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>⚡ Implanted Devices</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">MRI Caution</span>
                    </h3>

                    {patientData.devices && patientData.devices.length > 0 ? (
                      patientData.devices.map((d, idx) => (
                        <div key={idx} className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-1">
                          <div className="font-bold text-slate-900">{d.name || d.device_name}</div>
                          {d.model_number && <div className="text-slate-600">Model: {d.model_number}</div>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg">No implanted devices recorded.</p>
                    )}
                  </div>

                  {/* Surgeries */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      🏥 Past Operative Procedures
                    </h3>

                    {patientData.surgeries && patientData.surgeries.length > 0 ? (
                      patientData.surgeries.map((s, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                          <div className="font-bold text-slate-900">{s.procedure || s.surgery_name}</div>
                          <div className="text-slate-500">
                            {s.surgery_date && `Date: ${s.surgery_date} • `}
                            {s.hospital_name || "Hospital Facility"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg">No surgical records found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT */}
              {clinicalTab === "audit" && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs text-xs">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Forensic Access Record</h3>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-slate-600">
                    <div className="flex justify-between">
                      <span>Accessing Facility:</span>
                      <strong className="text-slate-900">{hospitalSession.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Accreditation ID:</span>
                      <strong className="font-mono text-slate-900">{hospitalSession.hospital_id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Attending Staff:</span>
                      <strong className="text-slate-900">{staffSession.doctor_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Access Tier:</span>
                      <strong className="text-emerald-700">Red Tier (Full Clinical & Surgical Record)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Audit Timestamp:</span>
                      <span className="font-mono text-slate-700">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* WARD / RECENT ADMISSIONS TABLE SECTION */}
          {navSection === "ward_patients" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Ward Admissions (Current Shift)</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Patient Name & PRANA ID</th>
                    <th className="py-2.5 px-3">Age / Gender</th>
                    <th className="py-2.5 px-3">Blood Group</th>
                    <th className="py-2.5 px-3">Admission Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPatients.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <span className="font-mono text-[11px] text-teal-700 font-medium">{p.pid}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.age} Yrs</td>
                      <td className="py-3 px-3 font-bold text-red-700">{p.blood}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => { setSearchPid(p.pid); performSearch(p.pid); setNavSection("patient_lookup"); }}
                          className="text-xs font-bold text-teal-700 hover:text-teal-800 underline"
                        >
                          Load Record →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
