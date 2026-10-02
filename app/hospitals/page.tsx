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

interface Paramedic {
  id: string;
  responder_code: string;
  employee_id: string;
  name: string;
  phone: string;
  organization: string;
  organization_type: string;
  is_active: boolean;
  expires_at: string;
  last_verified_at: string;
}

interface PatientSearchResponse {
  success: boolean;
  allowed: boolean;
  card_status: string;
  patient: {
    prana_id: string;
    full_name: string;
    phone: string;
    date_of_birth: string;
    age: number;
    gender: string;
    blood_group: string;
    weight_kg?: number;
    height_cm?: number;
    emergency_relay?: string;
    insurance_provider?: string;
    policy_number?: string;
    tpa_contact?: string;
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
  // Sidenav navigation section
  const [navSection, setNavSection] = useState<"patient_lookup" | "insurance_desk" | "paramedics" | "admissions" | "facility_settings">("patient_lookup");

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
    doctor_id: "DOC-STATION-01",
    doctor_name: "Attending Duty Physician",
    department: "Emergency Medicine & Trauma Resuscitation",
    role: "Attending Emergency Physician",
  });

  const [showSwitchFacility, setShowSwitchFacility] = useState(false);
  const [facilitySelect, setFacilitySelect] = useState("HOSP-AIIMS-01");
  const [doctorNameInput, setDoctorNameInput] = useState("Attending Duty Physician");

  // Patient Search (By PRANA ID or Phone Number)
  const [searchPid, setSearchPid] = useState("PRAN-ba42c5c2");
  const [isSearching, setIsSearching] = useState(false);
  const [patientData, setPatientData] = useState<PatientSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active EHR Clinical Tab
  const [clinicalTab, setClinicalTab] = useState<"triage" | "medications" | "vitals" | "history" | "insurance" | "audit">("triage");

  // Insurance & Pre-Auth Claim State
  const [isVerifyingInsurance, setIsVerifyingInsurance] = useState(false);
  const [insuranceClaimResult, setInsuranceClaimResult] = useState<{
    claim_reference: string;
    verification_status: string;
    approved_initial_limit: number;
    tpa_approval_code: string;
    instructions: string;
    insurer: string;
    policy_number: string;
    adjudicated_at: string;
  } | null>(null);
  const [customClaimAmount, setCustomClaimAmount] = useState("150000");

  // Paramedic Management State for THIS Hospital
  const [hospitalParamedics, setHospitalParamedics] = useState<Paramedic[]>([]);
  const [isLoadingParamedics, setIsLoadingParamedics] = useState(false);
  const [showAddParamedicModal, setShowAddParamedicModal] = useState(false);
  const [paramedicForm, setParamedicForm] = useState({
    name: "",
    phone: "",
    responder_code: "",
    employee_id: "",
    unit_type: "ambulance",
  });
  const [isSubmittingParamedic, setIsSubmittingParamedic] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Department quick metrics
  const erMetrics = {
    occupancy: "88%",
    openBeds: 4,
    traumaCases: 19,
    bloodBankUnits: "14 Units",
  };

  const recentPatients = [
    { pid: "PRAN-ba42c5c2", phone: "9489365108", name: "Sreeju S", age: 19, blood: "B+", status: "Active (Clear)" },
    { pid: "PRAN-9921D8A2", phone: "9811223344", name: "Kavita Ramachandran", age: 34, blood: "O+", status: "Active (Allergy Alert)" },
    { pid: "PRAN-4410A1B0", phone: "9876543210", name: "Rohan Varma", age: 48, blood: "A+", status: "Suspended" },
  ];

  // Load Paramedics for this hospital
  const fetchHospitalParamedics = async (hospName?: string) => {
    setIsLoadingParamedics(true);
    try {
      const res = await fetch("/api/responders");
      const data = await res.json();
      if (data.success) {
        const targetOrg = hospName || hospitalSession.name;
        // Filter paramedics belonging to this hospital or general EMS
        const filtered = (data.data as Paramedic[]).filter(
          p => p.organization.toLowerCase().includes(targetOrg.toLowerCase()) ||
               p.organization.toLowerCase().includes("emergency") ||
               p.organization.toLowerCase().includes("aiims")
        );
        setHospitalParamedics(filtered.length > 0 ? filtered : data.data);
      }
    } catch {
      showToast("Error loading paramedic team", "error");
    } finally {
      setIsLoadingParamedics(false);
    }
  };

  // Perform Patient Search (Universal PRANA ID OR Mobile Number)
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/hospitals/search-patient?prana_id=${encodeURIComponent(query.trim())}&hospital_id=${encodeURIComponent(hospitalSession.hospital_id)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No patient file found with this PRANA ID or phone number");
      }

      setPatientData(data as PatientSearchResponse);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Failed to retrieve clinical file");
      setPatientData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Add / Provision Paramedic Login Credentials for this Hospital
  const handleCreateHospitalParamedic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingParamedic(true);

    try {
      const res = await fetch("/api/responders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: paramedicForm.name.trim(),
          phone: paramedicForm.phone.trim(),
          responder_code: paramedicForm.responder_code.trim() || undefined,
          employee_id: paramedicForm.employee_id.trim() || undefined,
          organization: hospitalSession.name,
          organization_type: paramedicForm.unit_type,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to provision paramedic credentials");
      }

      showToast(`Paramedic login credentials provisioned: ${data.data.responder_code}`);
      setShowAddParamedicModal(false);
      setParamedicForm({ name: "", phone: "", responder_code: "", employee_id: "", unit_type: "ambulance" });
      fetchHospitalParamedics();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create paramedic", "error");
    } finally {
      setIsSubmittingParamedic(false);
    }
  };

  // Toggle Paramedic Login Active/Revoked status
  const handleToggleParamedicStatus = async (paramedic: Paramedic) => {
    try {
      const res = await fetch("/api/responders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paramedic.id, is_active: !paramedic.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setHospitalParamedics(prev =>
          prev.map(p => (p.id === paramedic.id ? { ...p, is_active: !paramedic.is_active } : p))
        );
        showToast(`Paramedic ${paramedic.name} login credentials ${!paramedic.is_active ? "re-activated" : "suspended"}`);
      }
    } catch {
      showToast("Failed to modify paramedic status", "error");
    }
  };

  // Verify Cashless Insurance Pre-Authorization
  const handleVerifyInsurance = async () => {
    if (!patientData) {
      showToast("Please search for a patient first", "error");
      return;
    }
    setIsVerifyingInsurance(true);
    try {
      const res = await fetch("/api/hospitals/insurance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prana_id: patientData.patient.prana_id || patientData.patient.phone,
          provider_name: patientData.patient.insurance_provider,
          policy_number: patientData.patient.policy_number,
          claim_amount: Number(customClaimAmount) || 200000,
          admission_type: "Emergency / Trauma Inpatient",
          hospital_id: hospitalSession.hospital_id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pre-authorization check failed");
      }
      setInsuranceClaimResult(data);
      showToast(`Pre-authorization approved! Claim Ref: ${data.claim_reference}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to verify insurance", "error");
    } finally {
      setIsVerifyingInsurance(false);
    }
  };

  useEffect(() => {
    // Check if hospital staff session exists in localStorage
    try {
      const storedHosp = localStorage.getItem("prana_hosp_session");
      const storedStaff = localStorage.getItem("prana_staff_session");
      if (storedHosp) {
        const hospObj = JSON.parse(storedHosp);
        setHospitalSession(hospObj);
      }
      if (storedStaff) {
        const staffObj = JSON.parse(storedStaff);
        setStaffSession(staffObj);
      }
    } catch {
      // fallback to defaults
    }

    performSearch("PRAN-ba42c5c2");
    fetchHospitalParamedics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-teal-600 selection:text-white antialiased">
      {/* Toast popup */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 border ${
          toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-900 border-slate-800 text-white"
        }`}>
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

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
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Hospital Facility</div>
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
              <span>Patient Records & Lookup</span>
            </button>

            <button
              onClick={() => {
                setNavSection("insurance_desk");
                setClinicalTab("insurance");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "insurance_desk"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">💳</span>
              <span>Insurance & TPA Claims</span>
            </button>

            <button
              onClick={() => { setNavSection("paramedics"); fetchHospitalParamedics(); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "paramedics"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">👨‍⚕️</span>
                <span>Manage Paramedics</span>
              </div>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono font-bold">
                {hospitalParamedics.length}
              </span>
            </button>

            <button
              onClick={() => setNavSection("admissions")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "admissions"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">📋</span>
              <span>Shift Admissions & Ward</span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                MD
              </div>
              <div className="text-xs truncate">
                <div className="font-bold text-slate-800 truncate">{staffSession.doctor_name || "Duty Physician"}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{staffSession.doctor_id || "Active Station"}</div>
              </div>
            </div>
            <Link
              href="/hospitals/login"
              title="Sign Out to Hospital Login"
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition shrink-0"
            >
              Logout 🚪
            </Link>
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
            {navSection === "paramedics" && (
              <button
                onClick={() => setShowAddParamedicModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-xs"
              >
                <span>➕</span> Provision Paramedic
              </button>
            )}
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
                  const newName = facilitySelect.includes("AIIMS") ? "AIIMS New Delhi - Trauma & Emergency Center" :
                                 facilitySelect.includes("MAX") ? "Max Super Speciality Hospital Saket" :
                                 facilitySelect.includes("APOLLO") ? "Indraprastha Apollo Hospitals" : "Fortis Memorial Research Institute";
                  setHospitalSession({
                    ...hospitalSession,
                    hospital_id: facilitySelect,
                    name: newName
                  });
                  setStaffSession({ ...staffSession, doctor_name: doctorNameInput });
                  setShowSwitchFacility(false);
                  fetchHospitalParamedics(newName);
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

          {/* ═════════ SECTION 1: PATIENT LOOKUP (BY PRANA ID OR PHONE NUMBER) & INSURANCE DESK ═════════ */}
          {(navSection === "patient_lookup" || navSection === "insurance_desk") && (
            <div className="space-y-6">
              {/* SEARCH & INTAKE BAR */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Patient Search & Emergency File Retrieval</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search using either patient&apos;s <strong>Universal PRANA ID</strong> or their <strong>Registered Mobile Number</strong>.
                    </p>
                  </div>

                  {/* Search Form */}
                  <div className="flex gap-2 sm:w-[420px]">
                    <input
                      type="text"
                      value={searchPid}
                      onChange={(e) => setSearchPid(e.target.value)}
                      placeholder="Enter PRANA ID (e.g. PRAN-ba42c5c2) or Phone Number (e.g. 9489365108)"
                      className="flex-1 bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-900 outline-none"
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

                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-4">
                  <span>Quick Test Identifiers:</span>
                  <span
                    onClick={() => { setSearchPid("PRAN-ba42c5c2"); performSearch("PRAN-ba42c5c2"); }}
                    className="font-mono text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    PRAN-ba42c5c2 (PRANA ID)
                  </span>
                  <span>•</span>
                  <span
                    onClick={() => { setSearchPid("9489365108"); performSearch("9489365108"); }}
                    className="font-mono text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    9489365108 (Mobile Number)
                  </span>
                </div>
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
                          <span>Phone: <strong className="font-mono text-slate-800">{patientData.patient.phone}</strong></span>
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
                        { id: "insurance", label: "🛡️ Insurance & Coverage" },
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
                                  <div className="text-[11px] text-slate-500">Relationship: <strong>{contact.relationship}</strong> • Phone: <span className="font-mono">{contact.phone}</span></div>
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

                  {/* TAB 5: INSURANCE DETAILS & CASHLESS PRE-AUTH */}
                  {clinicalTab === "insurance" && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>💳</span> Insurance Coverage & Cashless TPA Desk
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Verify policy status, co-pay waiver, and process instant emergency cashless pre-authorization.
                          </p>
                        </div>
                        <button
                          onClick={handleVerifyInsurance}
                          disabled={isVerifyingInsurance}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-2 shrink-0 self-start sm:self-auto"
                        >
                          {isVerifyingInsurance ? (
                            <>
                              <span className="animate-spin text-sm">⏳</span>
                              <span>Pinging TPA Gateway...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>Process Cashless Pre-Auth</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Policy & Coverage Snapshot */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Policy Particulars</h4>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Primary Insurer:</span>
                            <strong className="text-slate-900">{patientData.patient.insurance_provider || "Star Health & Allied Insurance"}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Policy / Member ID:</span>
                            <strong className="font-mono text-teal-800">{patientData.patient.policy_number || "POL-99210-PRANA"}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Insured Patient:</span>
                            <span className="font-bold text-slate-800">{patientData.patient.full_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Registered Mobile:</span>
                            <span className="font-mono text-slate-800">{patientData.patient.phone}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Hospital Empanelment & TPA</h4>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">TPA Helpdesk Toll-Free:</span>
                            <strong className="font-mono text-slate-900">{patientData.patient.tpa_contact || "1800-425-2255"}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Network Tier:</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                              Tier-A Empaneled Partner
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Co-Pay Requirement:</span>
                            <strong className="text-slate-900">0% (Emergency Resuscitation Waiver)</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Active Hospital:</span>
                            <span className="font-bold text-slate-800">{hospitalSession.hospital_id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Cashless Claim Amount Input */}
                      <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900">Initial Estimated Pre-Auth Admission Amount (₹)</span>
                          <p className="text-slate-500 text-[11px]">Specify estimated emergency stabilization & ICU deposit for automated pre-clearance.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
                            <input
                              type="number"
                              value={customClaimAmount}
                              onChange={(e) => setCustomClaimAmount(e.target.value)}
                              className="pl-7 pr-3 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-mono font-bold w-36 outline-none focus:ring-1 focus:ring-teal-600"
                              placeholder="150000"
                            />
                          </div>
                          <button
                            onClick={handleVerifyInsurance}
                            disabled={isVerifyingInsurance}
                            className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Update & Submit
                          </button>
                        </div>
                      </div>

                      {/* Active Pre-Authorization Certificate */}
                      {insuranceClaimResult ? (
                        <div className="p-5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3 text-xs animate-fade-in">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">✅</span>
                              <span className="font-bold text-emerald-900 uppercase tracking-wide text-xs">
                                Cashless Pre-Authorization Approved
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              Ref: {insuranceClaimResult.claim_reference}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Initial Approved Cap</span>
                              <div className="text-xl font-black text-emerald-700 mt-0.5">
                                ₹{insuranceClaimResult.approved_initial_limit.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">TPA Authorization Code</span>
                              <div className="text-base font-mono font-bold text-slate-800 mt-1">
                                {insuranceClaimResult.tpa_approval_code}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Adjudication Time</span>
                              <div className="text-xs font-mono text-slate-600 mt-1">
                                {new Date(insuranceClaimResult.adjudicated_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-emerald-100/60 rounded-lg text-[11px] text-emerald-950 font-medium flex items-start gap-2">
                            <span>ℹ️</span>
                            <span>{insuranceClaimResult.instructions}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1">
                          <p className="text-xs font-bold text-slate-700">Pre-Authorization Pending Submission</p>
                          <p className="text-[11px] text-slate-500">
                            Click &quot;Process Cashless Pre-Auth&quot; above to instantaneously trigger verification against the TPA claims clearinghouse.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: AUDIT */}
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
            </div>
          )}

          {/* ═════════ SECTION 2: HOSPITAL PARAMEDICS & CREDENTIALS MANAGEMENT ═════════ */}
          {navSection === "paramedics" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Hospital Emergency Responders & Paramedic Crew</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provision, manage, and revoke field login credentials and badge codes for {hospitalSession.name}.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddParamedicModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <span>➕</span> Provision New Paramedic Badge
                </button>
              </div>

              {/* Modal: Provision Paramedic Badge */}
              {showAddParamedicModal && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Provision Paramedic Login Credentials ({hospitalSession.name})
                    </h3>
                    <button onClick={() => setShowAddParamedicModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                  </div>

                  <form onSubmit={handleCreateHospitalParamedic} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Paramedic / Officer Name</label>
                      <input
                        type="text"
                        value={paramedicForm.name}
                        onChange={(e) => setParamedicForm({ ...paramedicForm, name: e.target.value })}
                        placeholder="e.g. Officer Anita Verma"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-teal-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Official Mobile # (Used for Login)</label>
                      <input
                        type="tel"
                        value={paramedicForm.phone}
                        onChange={(e) => setParamedicForm({ ...paramedicForm, phone: e.target.value })}
                        placeholder="e.g. 9811223344"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Custom Badge Code (Optional)</label>
                      <input
                        type="text"
                        value={paramedicForm.responder_code}
                        onChange={(e) => setParamedicForm({ ...paramedicForm, responder_code: e.target.value })}
                        placeholder="e.g. PARAM-AIIMS-10"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Emergency Unit Type</label>
                      <select
                        value={paramedicForm.unit_type}
                        onChange={(e) => setParamedicForm({ ...paramedicForm, unit_type: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none"
                      >
                        <option value="ambulance">Advanced Life Support (ALS) Ambulance</option>
                        <option value="hospital">Hospital Trauma Emergency Team</option>
                        <option value="police">Police First Responder</option>
                        <option value="fire">Fire & Rescue Department</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddParamedicModal(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingParamedic}
                        className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition"
                      >
                        {isSubmittingParamedic ? "Provisioning..." : "Issue Credentials"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Paramedics Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Paramedic & Badge</th>
                      <th className="py-2.5 px-3">Login Phone</th>
                      <th className="py-2.5 px-3">Unit / Organization</th>
                      <th className="py-2.5 px-3">Clearance Status</th>
                      <th className="py-2.5 px-3">Expires</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hospitalParamedics.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <span className="font-mono text-[11px] text-teal-700 font-bold">{p.responder_code}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-800 font-semibold">{p.phone}</td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{p.organization}</div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">{p.organization_type}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {p.is_active ? "Active & Authorized" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "30 days"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleParamedicStatus(p)}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 border border-slate-200"
                          >
                            {p.is_active ? "Suspend Login" : "Re-activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═════════ SECTION 3: WARD / SHIFT ADMISSIONS ═════════ */}
          {navSection === "admissions" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Emergency & Ward Admissions (Current Shift)</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Patient Name & PRANA ID</th>
                    <th className="py-2.5 px-3">Registered Phone</th>
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
                      <td className="py-3 px-3 font-mono text-slate-800 font-semibold">{p.phone}</td>
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

          {/* ═════════ SECTION 4: FACILITY SETTINGS ═════════ */}
          {navSection === "facility_settings" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Hospital Accreditation Information</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Facility Name:</span>
                  <strong className="text-slate-900">{hospitalSession.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hospital Identifier:</span>
                  <strong className="font-mono text-teal-800">{hospitalSession.hospital_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">State Medical Council Registration:</span>
                  <strong className="font-mono text-slate-900">{hospitalSession.registration_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-800">{hospitalSession.city}, {hospitalSession.state}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
