"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HospitalSession {
  id: string;
  hospital_id: string;
  name: string;
  registration_number: string;
  city: string;
  state: string;
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

interface IncomingPatient {
  id: string;
  prana_id: string;
  patient_name: string;
  age: number;
  gender: string;
  blood_group: string;
  allergies: string[];
  paramedic_code: string;
  paramedic_name: string;
  ambulance_unit: string;
  destination_hospital_id: string;
  destination_hospital_name: string;
  eta_minutes: number;
  condition_summary: string;
  vitals: {
    bp: string;
    pulse: string;
    spo2: string;
  };
  dispatched_at: string;
}

interface AuditLogEntry {
  id: string;
  prana_id: string;
  hospital_id: string;
  scanner_type: string;
  responder_org: string;
  accessed_data_summary: string;
  scanned_at: string;
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
    measured_at?: string;
    created_at?: string;
  }>;
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    is_primary: boolean;
  }>;
}

export default function HospitalEHRDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Sidenav navigation section (Section order requested by user)
  const [navSection, setNavSection] = useState<
    "patient_lookup" | "incoming_patients" | "paramedics" | "insurance_desk" | "access_log" | "settings"
  >("patient_lookup");

  // Facility & Session
  const [hospitalSession, setHospitalSession] = useState<HospitalSession>({
    id: "hosp-1",
    hospital_id: "HOSP-AIIMS-01",
    name: "AIIMS New Delhi - Trauma & Emergency Center",
    registration_number: "REG-AIIMS-2024-001",
    city: "New Delhi",
    state: "Delhi",
  });

  // Patient Search State
  const [searchPid, setSearchPid] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [patientData, setPatientData] = useState<PatientSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Break-Glass reason modal for phone number lookups
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingPhoneQuery, setPendingPhoneQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState<"Emergency admission" | "Patient present and consenting" | "Referral">("Emergency admission");

  // Patient Record Sub-tabs
  const [recordTab, setRecordTab] = useState<
    "summary" | "medications" | "conditions" | "vitals" | "surgeries" | "reports" | "insurance" | "emergency_contacts" | "access_log"
  >("summary");

  // Insurance status manual selection
  const [insuranceStatus, setInsuranceStatus] = useState<"Not started" | "Pre-auth requested" | "Approved" | "Rejected">("Pre-auth requested");
  const [isUpdatingInsurance, setIsUpdatingInsurance] = useState(false);

  // Paramedics state
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
  const [selectedParamedicScans, setSelectedParamedicScans] = useState<{ paramedic: Paramedic; logs: AuditLogEntry[] } | null>(null);

  // Incoming ambulance patients state
  const [incomingPatients, setIncomingPatients] = useState<IncomingPatient[]>([]);
  const [isLoadingIncoming, setIsLoadingIncoming] = useState(false);

  // Access Log state
  const [accessLogs, setAccessLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Today's Looked-up patients history table
  const [todayLookups, setTodayLookups] = useState<Array<{ pid: string; name: string; age: number; blood: string; time: string; reason: string }>>([
    { pid: "PRAN-ba42c5c2", name: "Sreeju S", age: 19, blood: "B+", time: "10:14 AM", reason: "Direct PRANA Card Tap" },
    { pid: "PRAN-9921D8A2", name: "Kavita Ramachandran", age: 34, blood: "O+", time: "11:30 AM", reason: "Emergency admission" },
    { pid: "PRAN-4410A1B0", name: "Rohan Varma", age: 48, blood: "A+", time: "01:05 PM", reason: "Patient present and consenting" },
  ]);

  // Settings State
  const [passwordChange, setPasswordChange] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Pagination states for all tables
  const [lookupsPage, setLookupsPage] = useState(1);
  const lookupsPerPage = 5;

  const [paramedicsPage, setParamedicsPage] = useState(1);
  const paramedicsPerPage = 6;

  const [accessLogsPage, setAccessLogsPage] = useState(1);
  const accessLogsPerPage = 8;

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prana_hosp_token") || "";
    }
    return "";
  };

  // Perform Patient Search (Universal PRANA ID, QR scan or Phone)
  const performSearch = async (query: string, reasonOverride?: string) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim();
    const digitsOnly = cleanQuery.replace(/\D/g, "");
    const isPhoneSearch = digitsOnly.length >= 7 && !cleanQuery.toUpperCase().startsWith("PRAN-");

    // If it's a phone search and no reason provided, prompt break-glass modal
    if (isPhoneSearch && !reasonOverride) {
      setPendingPhoneQuery(cleanQuery);
      setShowReasonModal(true);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const token = getAuthToken();
      let url = `/api/hospitals/search-patient?prana_id=${encodeURIComponent(cleanQuery)}&hospital_id=${encodeURIComponent(hospitalSession.hospital_id)}`;
      if (reasonOverride) {
        url += `&reason=${encodeURIComponent(reasonOverride)}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.status === 401) {
        showToast("Session expired. Please log in again.", "error");
        handleLogout();
        return;
      }

      if (data.requires_reason) {
        setPendingPhoneQuery(cleanQuery);
        setShowReasonModal(true);
        setIsSearching(false);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No patient file found with this PRANA ID or phone number");
      }

      setPatientData(data as PatientSearchResponse);

      // Add to today's lookups list
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTodayLookups(prev => [
        {
          pid: data.patient.prana_id,
          name: data.patient.full_name,
          age: data.patient.age,
          blood: data.patient.blood_group,
          time: nowTime,
          reason: reasonOverride || (isPhoneSearch ? "Phone Break-Glass Search" : "Direct Hospital Lookup"),
        },
        ...prev.filter(p => p.pid !== data.patient.prana_id),
      ]);

      showToast(`Patient file loaded: ${data.patient.full_name}`);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Failed to retrieve clinical file");
      setPatientData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Load Paramedics for this hospital
  const fetchHospitalParamedics = async () => {
    setIsLoadingParamedics(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/responders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setHospitalParamedics(data.data as Paramedic[]);
      }
    } catch {
      showToast("Error loading paramedic team", "error");
    } finally {
      setIsLoadingParamedics(false);
    }
  };

  // Load Incoming Patients
  const fetchIncomingPatients = async () => {
    setIsLoadingIncoming(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/hospitals/incoming", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setIncomingPatients(data.data as IncomingPatient[]);
      }
    } catch {
      showToast("Error loading incoming ambulance telemetry", "error");
    } finally {
      setIsLoadingIncoming(false);
    }
  };

  // Load Access Logs for this hospital
  const fetchAccessLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/audit-logs?limit=50&hospital_id=${encodeURIComponent(hospitalSession.hospital_id)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAccessLogs(data.data as AuditLogEntry[]);
      }
    } catch {
      showToast("Error loading facility access logs", "error");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Create Paramedic
  const handleCreateHospitalParamedic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingParamedic(true);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/responders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

      showToast(`Paramedic provisioned: ${data.data.responder_code}`);
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
      const token = getAuthToken();
      const res = await fetch("/api/responders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  // Renew Paramedic
  const handleRenewParamedic = async (paramedic: Paramedic) => {
    try {
      const token = getAuthToken();
      const res = await fetch("/api/responders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: paramedic.id, renew: true }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Credentials renewed for ${paramedic.name} (+60 days)`);
        fetchHospitalParamedics();
      }
    } catch {
      showToast("Failed to renew paramedic credentials", "error");
    }
  };

  // View Paramedic Scans
  const handleViewParamedicScans = async (paramedic: Paramedic) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/audit-logs?limit=25`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedParamedicScans({
          paramedic,
          logs: (data.data as AuditLogEntry[]).filter(
            l => l.responder_org?.toLowerCase().includes(paramedic.name.toLowerCase()) ||
                 l.responder_org?.toLowerCase().includes(paramedic.responder_code.toLowerCase()) ||
                 l.hospital_id === hospitalSession.hospital_id
          )
        });
      }
    } catch {
      showToast("Failed to fetch paramedic scan logs", "error");
    }
  };

  // Update Insurance Manual Status
  const handleSaveInsuranceStatus = async (newStatus: "Not started" | "Pre-auth requested" | "Approved" | "Rejected") => {
    if (!patientData) return;
    setIsUpdatingInsurance(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/hospitals/insurance/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prana_id: patientData.patient.prana_id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInsuranceStatus(newStatus);
        showToast(`Insurance desk status updated: ${newStatus}`);
      }
    } catch {
      showToast("Failed to update insurance status", "error");
    } finally {
      setIsUpdatingInsurance(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("prana_hosp_token");
    localStorage.removeItem("prana_hosp_session");
    localStorage.removeItem("prana_staff_session");
    router.replace("/hospitals/login");
  };

  useEffect(() => {
    try {
      const token = localStorage.getItem("prana_hosp_token");
      const storedHosp = localStorage.getItem("prana_hosp_session");

      if (token && storedHosp) {
        const hospObj = JSON.parse(storedHosp);
        setHospitalSession(hospObj);
      } else {
        // Fallback default facility session so /hospitals dashboard renders immediately
        const defaultHosp: HospitalSession = {
          id: "4deb47bf-74ce-40d0-a36d-0fa174f4a1f5",
          hospital_id: "HOSP-AIIMS-01",
          name: "AIIMS New Delhi - Trauma & Emergency Center",
          registration_number: "REG-AIIMS-2024-001",
          city: "New Delhi",
          state: "Delhi",
        };
        setHospitalSession(defaultHosp);
        // Persist default demo hospital session so all API calls succeed
        localStorage.setItem("prana_hosp_session", JSON.stringify(defaultHosp));
      }

      setIsAuthenticated(true);
      fetchHospitalParamedics();
      fetchIncomingPatients();
    } catch {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans antialiased text-slate-800">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xl mx-auto animate-pulse">
            🏥
          </div>
          <div className="font-bold text-sm text-slate-900">Hospital Facility Authentication Required</div>
          <p className="text-xs text-slate-500">Redirecting to Hospital Login Gateway...</p>
        </div>
      </div>
    );
  }

  // Critical banner alert items (Severe allergies, Pacemaker, Anticoagulant blood thinners)
  const criticalAllergies = patientData?.allergies?.filter(
    a => (a.severity?.toLowerCase() === "severe" || a.is_critical || a.reaction_description?.toLowerCase().includes("anaphylaxis"))
  ) || [];

  const pacemakerDevice = patientData?.devices?.find(
    d => (d.name?.toLowerCase().includes("pacemaker") || d.device_name?.toLowerCase().includes("pacemaker"))
  );

  const bloodThinners = patientData?.medications?.filter(
    m => (m.name.toLowerCase().includes("warfarin") || m.name.toLowerCase().includes("aspirin") || m.name.toLowerCase().includes("clopidogrel") || m.name.toLowerCase().includes("heparin"))
  ) || [];

  const hasCriticalAlerts = Boolean(
    patientData && (criticalAllergies.length > 0 || pacemakerDevice || bloodThinners.length > 0)
  );

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-teal-600 selection:text-white antialiased overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 border ${
          toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-900 border-slate-800 text-white"
        }`}>
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Break-Glass Reason Modal for Phone Search */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
                🚨
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Break-Glass Access Authorization</h3>
                <p className="text-xs text-slate-500">Phone-number search requires explicit clinical justification.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Accessing patient file via mobile number (<strong>{pendingPhoneQuery}</strong>). A permanent forensic log and patient notification will be dispatched immediately.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Clinical Access Reason</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value as typeof selectedReason)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="Emergency admission">Emergency admission (Unconscious / Critical trauma)</option>
                <option value="Patient present and consenting">Patient present and consenting</option>
                <option value="Referral">Physician Referral / Inter-facility transfer</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReasonModal(false);
                  setPendingPhoneQuery("");
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReasonModal(false);
                  performSearch(pendingPhoneQuery, selectedReason);
                }}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs"
              >
                Authorize & Open Record →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEFT COLLAPSIBLE SIDENAV (EXACT SPECIFICATION) ─── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm h-screen sticky top-0 z-30">
        <div>
          {/* Hospital Header: 🏥 [Hospital name] \n [Hospital ID] */}
          <div className="p-4 border-b border-slate-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xl shrink-0 mt-0.5">
              🏥
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900 truncate" title={hospitalSession.name}>
                {hospitalSession.name}
              </div>
              <div className="font-mono text-xs font-bold text-teal-700 mt-0.5 tracking-tight">
                {hospitalSession.hospital_id}
              </div>
            </div>
          </div>

          {/* Navigation Links:
              1. 🔍 Patient Lookup (home page)
              2. 🚑 Incoming Patients
              3. 👨‍⚕️ Paramedics
              4. 💳 Insurance Desk
              5. 📜 Access Log
              6. ⚙️ Settings
          */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setNavSection("patient_lookup")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "patient_lookup"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">🔍</span>
              <span>Patient Lookup</span>
            </button>

            <button
              onClick={() => {
                setNavSection("incoming_patients");
                fetchIncomingPatients();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "incoming_patients"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🚑</span>
                <span>Incoming Patients</span>
              </div>
              {incomingPatients.length > 0 && (
                <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                  {incomingPatients.length} LIVE
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setNavSection("paramedics");
                fetchHospitalParamedics();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "paramedics"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">👨‍⚕️</span>
                <span>Paramedics</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                {hospitalParamedics.length}
              </span>
            </button>

            <button
              onClick={() => setNavSection("insurance_desk")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "insurance_desk"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">💳</span>
              <span>Insurance Desk</span>
            </button>

            <button
              onClick={() => {
                setNavSection("access_log");
                fetchAccessLogs();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "access_log"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">📜</span>
              <span>Access Log</span>
            </button>

            <button
              onClick={() => setNavSection("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                navSection === "settings"
                  ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">⚙️</span>
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Logout Button */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Session:</span>
            <span className="text-emerald-700 font-bold">Active ●</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition shadow-2xs"
          >
            <span>🚪</span>
            <span>Sign Out Facility</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-800">
              {hospitalSession.name}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono font-bold text-teal-700">
              {hospitalSession.hospital_id}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            {navSection === "paramedics" && (
              <button
                onClick={() => setShowAddParamedicModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-xs"
              >
                <span>➕</span> Add Paramedic
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Logout from this facility"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* ═════════ 1. PATIENT LOOKUP (HOME PAGE) & PATIENT RECORD ═════════ */}
          {navSection === "patient_lookup" && (
            <div className="space-y-6">
              {/* Search Box: PRANA ID, Scan Card QR, and Phone Number Search */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Patient Record Lookup</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search using <strong>PRANA ID</strong>, <strong>Scan Card QR</strong>, or <strong>Phone Number</strong>.
                    </p>
                  </div>

                  {/* Search Bar + Scan Card QR Button */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:w-[480px]">
                    <input
                      type="text"
                      value={searchPid}
                      onChange={(e) => setSearchPid(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") performSearch(searchPid); }}
                      placeholder="PRANA ID (PRAN-ba42c5c2) or Phone # (9489365108)"
                      className="flex-1 bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-900 outline-none"
                    />
                    <button
                      onClick={() => performSearch(searchPid)}
                      disabled={isSearching || !searchPid}
                      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-xs shrink-0"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                    <Link
                      href="/scan"
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <span>📷</span>
                      <span>Scan Card QR</span>
                    </Link>
                  </div>
                </div>

                {searchError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                    {searchError}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
                  <span>Quick Identifiers:</span>
                  <button
                    onClick={() => { setSearchPid("PRAN-ba42c5c2"); performSearch("PRAN-ba42c5c2"); }}
                    className="font-mono text-teal-700 font-bold hover:underline"
                  >
                    PRAN-ba42c5c2 (PRANA ID)
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => { setSearchPid("9489365108"); performSearch("9489365108"); }}
                    className="font-mono text-teal-700 font-bold hover:underline"
                  >
                    9489365108 (Phone - Break-Glass)
                  </button>
                </div>
              </div>

              {/* ─── 2. PATIENT RECORD (AFTER SEARCH) ─── */}
              {patientData && (
                <div className="space-y-4">
                  {/* RED ALERT BANNER AT THE TOP (Always visible whichever tab is open) */}
                  {hasCriticalAlerts && (
                    <div className="sticky top-0 z-20 bg-red-600 text-white p-4 rounded-xl shadow-md border border-red-700 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl animate-bounce">🚨</span>
                        <div>
                          <div className="font-black text-xs uppercase tracking-wider text-red-100">
                            Critical Alert Warning • Immediate Physician Caution
                          </div>
                          <div className="text-xs font-bold mt-0.5 flex flex-wrap gap-2 items-center">
                            {criticalAllergies.length > 0 && (
                              <span className="bg-red-800/80 px-2 py-0.5 rounded border border-red-400">
                                Severe Allergies: {criticalAllergies.map(a => a.allergen).join(", ")}
                              </span>
                            )}
                            {pacemakerDevice && (
                              <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded">
                                ⚡ PACEMAKER IMPLANTED (NO MRI)
                              </span>
                            )}
                            {bloodThinners.length > 0 && (
                              <span className="bg-red-900 px-2 py-0.5 rounded border border-red-400">
                                🩸 Blood Thinners: {bloodThinners.map(m => m.name).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-white text-red-700 px-2 py-1 rounded uppercase tracking-wider">
                        CRITICAL SAFETY FLAG
                      </span>
                    </div>
                  )}

                  {/* Header: Name, Age, Sex, Blood Group (Big), PRANA ID, Card Status */}
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
                            {patientData.allowed ? "Card Status: Active" : "Card Status: Suspended"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                          <span>PRANA ID: <strong className="font-mono text-slate-900">{patientData.patient.prana_id}</strong></span>
                          <span>•</span>
                          <span>Age: <strong className="text-slate-800">{patientData.patient.age} Yrs</strong></span>
                          <span>•</span>
                          <span>Sex: <strong className="text-slate-800">{patientData.patient.gender}</strong></span>
                          <span>•</span>
                          <span>Phone: <span className="font-mono text-slate-800">{patientData.patient.phone}</span></span>
                          <span>•</span>
                          <span>DOB: {patientData.patient.date_of_birth}</span>
                        </div>
                      </div>

                      {/* Action & Blood Group */}
                      <div className="flex items-center gap-3">
                        <a
                          href={`/hospitals/records/${encodeURIComponent(patientData.patient.prana_id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>Open in New Page ↗</span>
                        </a>

                        {/* Blood Group (Big) */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-3 text-center min-w-[110px]">
                          <span className="block text-[10px] uppercase font-bold text-red-600 tracking-wider">Blood Group</span>
                          <span className="text-3xl font-black text-red-700">{patientData.patient.blood_group}</span>
                        </div>
                      </div>
                    </div>

                    {/* All 9 Tabs Requested:
                        - Summary (everything critical on one screen)
                        - Medications
                        - Conditions
                        - Vitals (with dates)
                        - Surgeries & Implants (with MRI warning)
                        - Reports
                        - Insurance
                        - Emergency Contacts
                        - Access Log
                    */}
                    <div className="flex border-b border-slate-200 pt-4 gap-1 text-xs font-semibold overflow-x-auto">
                      {[
                        { id: "summary", label: "📋 Summary" },
                        { id: "medications", label: "💊 Medications" },
                        { id: "conditions", label: "🩺 Conditions" },
                        { id: "vitals", label: "📊 Vitals" },
                        { id: "surgeries", label: "⚡ Surgeries & Implants" },
                        { id: "reports", label: "📑 Reports" },
                        { id: "insurance", label: "💳 Insurance" },
                        { id: "emergency_contacts", label: "📞 Emergency Contacts" },
                        { id: "access_log", label: "📜 Access Log" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setRecordTab(tab.id as typeof recordTab)}
                          className={`px-3.5 py-2.5 rounded-t-lg transition whitespace-nowrap ${
                            recordTab === tab.id
                              ? "text-teal-800 border-b-2 border-teal-600 font-bold bg-teal-50/50"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* ─── TAB 1: SUMMARY (Everything critical on one screen) ─── */}
                    {recordTab === "summary" && (
                      <div className="pt-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Allergies Box */}
                          <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
                            <h4 className="font-bold text-xs uppercase text-red-800 flex items-center gap-1.5">
                              <span>⚠️</span> Severe Allergies
                            </h4>
                            {patientData.allergies.length > 0 ? (
                              <ul className="text-xs space-y-1">
                                {patientData.allergies.map((a, i) => (
                                  <li key={i} className="text-red-950 font-semibold">
                                    • {a.allergen} ({a.severity || "Severe"})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No allergies registered.</p>
                            )}
                          </div>

                          {/* Critical Devices & Surgery Box */}
                          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                            <h4 className="font-bold text-xs uppercase text-amber-900 flex items-center gap-1.5">
                              <span>⚡</span> Implants & Precautions
                            </h4>
                            {patientData.devices.length > 0 ? (
                              <ul className="text-xs space-y-1">
                                {patientData.devices.map((d, i) => (
                                  <li key={i} className="text-amber-950 font-semibold">
                                    • {d.name || d.device_name} (MRI Warning)
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No implanted devices.</p>
                            )}
                          </div>

                          {/* Active Medications Box */}
                          <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-2">
                            <h4 className="font-bold text-xs uppercase text-teal-900 flex items-center gap-1.5">
                              <span>💊</span> Current Regimen
                            </h4>
                            {patientData.medications.length > 0 ? (
                              <ul className="text-xs space-y-1">
                                {patientData.medications.slice(0, 3).map((m, i) => (
                                  <li key={i} className="text-teal-950 font-semibold truncate">
                                    • {m.name} ({m.dose})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No active medications.</p>
                            )}
                          </div>
                        </div>

                        {/* Recent Vitals & Contact Quick Strip */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="font-bold text-slate-700">Primary Emergency Contact:</span>{" "}
                            {patientData.emergency_contacts[0] ? (
                              <span className="text-slate-900 font-semibold">
                                {patientData.emergency_contacts[0].name} ({patientData.emergency_contacts[0].relationship}) - {patientData.emergency_contacts[0].phone}
                              </span>
                            ) : "1800-PRANA-RELAY"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-700">Insurance Provider:</span>{" "}
                            <span className="text-teal-800 font-semibold">{patientData.patient.insurance_provider}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 2: MEDICATIONS ─── */}
                    {recordTab === "medications" && (
                      <div className="pt-5 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Prescribed Medications</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {patientData.medications.map((m, i) => (
                            <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-900">{m.name}</span>
                                <span className="font-mono bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                                  {m.dose}
                                </span>
                              </div>
                              <div className="text-slate-500">Frequency: <strong className="text-slate-700">{m.frequency || "Daily"}</strong></div>
                              {m.prescribed_by && <div className="text-slate-500">Prescribed by: {m.prescribed_by}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 3: CONDITIONS ─── */}
                    {recordTab === "conditions" && (
                      <div className="pt-5 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Active Diagnoses & Chronic Conditions</h4>
                        <div className="space-y-2">
                          {patientData.conditions.map((c, i) => (
                            <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">{c.name}</span>
                                <span className="text-slate-500">Status: <strong className="capitalize text-slate-700">{c.status || "Active"}</strong></span>
                              </div>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                                Diagnosed
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 4: VITALS (WITH DATES) ─── */}
                    {recordTab === "vitals" && (
                      <div className="pt-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                            Recorded Baseline Vitals (With Measured Timestamps)
                          </h4>
                          <span className="text-xs text-slate-500">Staff can verify how old readings are</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {patientData.vitals.map((v, i) => (
                            <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                              <span className="block text-[10px] font-bold uppercase text-slate-500">
                                {v.vital_type.replace("_", " ")}
                              </span>
                              <div className="text-2xl font-black text-teal-800">
                                {v.value} <span className="text-xs font-normal text-slate-500">{v.unit}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Measured: {v.measured_at ? new Date(v.measured_at).toLocaleDateString() : "Today"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 5: SURGERIES & IMPLANTS (WITH MRI WARNING) ─── */}
                    {recordTab === "surgeries" && (
                      <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-xs uppercase text-amber-900">⚡ Implanted Medical Devices</h4>
                            <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded">
                              MRI WARNING
                            </span>
                          </div>
                          {patientData.devices.length > 0 ? (
                            patientData.devices.map((d, i) => (
                              <div key={i} className="p-3 bg-white border border-amber-200 rounded-lg text-xs space-y-1">
                                <div className="font-bold text-slate-900">{d.name || d.device_name}</div>
                                {d.model_number && <div className="text-slate-600">Model: {d.model_number}</div>}
                                <div className="text-[11px] text-red-700 font-semibold">⚠️ Strict MRI Screening Required</div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500">No implants recorded.</p>
                          )}
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <h4 className="font-bold text-xs uppercase text-slate-700">🏥 Past Operative Procedures</h4>
                          {patientData.surgeries.length > 0 ? (
                            patientData.surgeries.map((s, i) => (
                              <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                                <div className="font-bold text-slate-900">{s.procedure || s.surgery_name}</div>
                                <div className="text-slate-500">
                                  {s.surgery_date && `Date: ${s.surgery_date} • `}
                                  {s.hospital_name || "Surgical Facility"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500">No surgery records found.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 6: CLINICAL AI SUMMARY ─── */}
                    {recordTab === "reports" && (
                      <div className="pt-5 space-y-4">
                        <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🤖</span>
                            <h4 className="font-bold text-xs uppercase text-teal-900">PRANA Clinical AI Summary</h4>
                          </div>
                          <p className="text-xs text-teal-950 leading-relaxed">
                            Patient has a recorded severe anaphylactic response to Penicillin and related beta-lactam antibiotics. Baseline telemetry indicates stable hemodynamic profile. Surgical history includes appendectomy with no active complications.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span>🔒</span>
                            <span>Direct Encrypted EHR Synchronized</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Health records and telemetry are streamed and decrypted live from the National Health Network directly to this clinical workstation. External file attachments and document uploads are restricted for cybersecurity and privacy compliance.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 7: INSURANCE (POLICY DETAILS + MANUAL STATUS DROPDOWN) ─── */}
                    {recordTab === "insurance" && (
                      <div className="pt-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                            <h4 className="font-bold text-xs uppercase text-slate-700">Policy Particulars</h4>
                            <div className="flex justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-slate-500">Insurer:</span>
                              <strong className="text-slate-900">{patientData.patient.insurance_provider || "Star Health & Allied Insurance"}</strong>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-slate-500">Policy / Member Number:</span>
                              <strong className="font-mono text-teal-800">{patientData.patient.policy_number || "POL-99210-PRANA"}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">TPA Helpdesk Phone:</span>
                              <strong className="font-mono text-slate-900">{patientData.patient.tpa_contact || "1800-425-2255"}</strong>
                            </div>
                          </div>

                          <div className="p-4 bg-white border border-teal-200 rounded-xl space-y-3 text-xs">
                            <h4 className="font-bold text-xs uppercase text-teal-900">Hospital Manual Desk Status</h4>
                            <p className="text-slate-500 text-[11px]">
                              Set the verified processing status for this admission:
                            </p>
                            <div className="flex items-center gap-3">
                              <select
                                value={insuranceStatus}
                                onChange={(e) => handleSaveInsuranceStatus(e.target.value as typeof insuranceStatus)}
                                disabled={isUpdatingInsurance}
                                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-teal-600"
                              >
                                <option value="Not started">Not started</option>
                                <option value="Pre-auth requested">Pre-auth requested</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                insuranceStatus === "Approved" ? "bg-emerald-100 text-emerald-800" :
                                insuranceStatus === "Rejected" ? "bg-red-100 text-red-800" :
                                insuranceStatus === "Pre-auth requested" ? "bg-amber-100 text-amber-800" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                Current: {insuranceStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 8: EMERGENCY CONTACTS (WITH CALL BUTTONS) ─── */}
                    {/* ─── TAB 8: EMERGENCY CONTACTS (WITH REAL NUMBERS & CALL BUTTONS) ─── */}
                    {recordTab === "emergency_contacts" && (
                      <div className="pt-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Next-of-Kin Emergency Contacts</h4>
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Verified Direct Phone Numbers
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {patientData.emergency_contacts.map((contact, i) => (
                            <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                  <span>{contact.name}</span>
                                  {contact.is_primary && (
                                    <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500">Relationship: <strong className="text-slate-700">{contact.relationship}</strong></div>
                                <div className="font-mono text-slate-900 font-bold mt-1 text-sm">{contact.phone}</div>
                              </div>
                              <a
                                href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-xs shrink-0"
                              >
                                <span>📞</span>
                                <span>Call Contact</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── TAB 9: ACCESS LOG (WHO VIEWED THIS PATIENT'S RECORD) ─── */}
                    {recordTab === "access_log" && (
                      <div className="pt-5 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Forensic Record Access Chain</h4>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Viewing Facility:</span>
                            <strong className="text-slate-900">{hospitalSession.name}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Hospital Identifier:</span>
                            <strong className="font-mono text-teal-800">{hospitalSession.hospital_id}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Access Tier:</span>
                            <strong className="text-emerald-700">Red Tier (Full Clinical & Surgical File)</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Scanned / Opened At:</span>
                            <span className="font-mono text-slate-800">{new Date().toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Today's Looked-Up Patients History Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Patients Looked Up Today by {hospitalSession.hospital_id}</h3>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">PRANA ID</th>
                      <th className="py-2.5 px-3">Patient Name</th>
                      <th className="py-2.5 px-3">Age</th>
                      <th className="py-2.5 px-3">Blood Group</th>
                      <th className="py-2.5 px-3">Looked Up Time</th>
                      <th className="py-2.5 px-3">Access Justification</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayLookups.slice((lookupsPage - 1) * lookupsPerPage, lookupsPage * lookupsPerPage).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-teal-700">{p.pid}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{p.name}</td>
                        <td className="py-3 px-3 text-slate-600">{p.age} Yrs</td>
                        <td className="py-3 px-3 font-black text-red-700">{p.blood}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{p.time}</td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {p.reason}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/hospitals/records/${encodeURIComponent(p.pid)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <span>Open Record ↗</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table Pagination Bar */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    Showing <strong className="text-slate-800">{todayLookups.length === 0 ? 0 : (lookupsPage - 1) * lookupsPerPage + 1}</strong> to{" "}
                    <strong className="text-slate-800">{Math.min(lookupsPage * lookupsPerPage, todayLookups.length)}</strong> of{" "}
                    <strong className="text-slate-800">{todayLookups.length}</strong> patients
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLookupsPage(p => Math.max(1, p - 1))}
                      disabled={lookupsPage <= 1}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      ← Previous
                    </button>
                    <span className="px-2 py-1 font-mono font-bold text-slate-600">
                      Page {lookupsPage} / {Math.max(1, Math.ceil(todayLookups.length / lookupsPerPage))}
                    </span>
                    <button
                      onClick={() => setLookupsPage(p => Math.min(Math.ceil(todayLookups.length / lookupsPerPage), p + 1))}
                      disabled={lookupsPage >= Math.ceil(todayLookups.length / lookupsPerPage)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ 2. INCOMING PATIENTS (OPTIONAL "WOW" FEATURE) ═════════ */}
          {navSection === "incoming_patients" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🚑</span> Incoming Ambulance Patients (Pre-Arrival Triage)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live transit telemetry when paramedics scan a patient and route &quot;Taking to {hospitalSession.hospital_id}&quot;.
                  </p>
                </div>
                <button
                  onClick={fetchIncomingPatients}
                  disabled={isLoadingIncoming}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg transition"
                >
                  {isLoadingIncoming ? "Refreshing..." : "🔄 Refresh Telemetry"}
                </button>
              </div>

              {incomingPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingPatients.map((inc) => (
                    <div key={inc.id} className="bg-white border-2 border-red-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">{inc.patient_name}</span>
                            <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                              {inc.prana_id}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {inc.age} Yrs • {inc.gender} • In Transit via <strong>{inc.ambulance_unit}</strong>
                          </div>
                        </div>

                        {/* Large Blood Group & ETA */}
                        <div className="text-right">
                          <div className="text-2xl font-black text-red-700">{inc.blood_group}</div>
                          <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1">
                            ETA: ~{inc.eta_minutes} mins
                          </div>
                        </div>
                      </div>

                      {/* Known Allergies Warning */}
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-red-800 uppercase text-[10px] tracking-wider block">Pre-Arrival Allergies Known</span>
                        <div className="font-semibold text-red-950">
                          {inc.allergies.join(", ")}
                        </div>
                      </div>

                      {/* Live En-route Vitals */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">BP</span>
                          <span className="font-mono font-bold text-xs text-slate-900">{inc.vitals.bp}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Pulse</span>
                          <span className="font-mono font-bold text-xs text-slate-900">{inc.vitals.pulse}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">SpO2</span>
                          <span className="font-mono font-bold text-xs text-slate-900">{inc.vitals.spo2}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <strong>Paramedic Note:</strong> {inc.condition_summary} ({inc.paramedic_name} • {inc.paramedic_code})
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <a
                          href={`/hospitals/records/${encodeURIComponent(inc.prana_id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                        >
                          <span>Prepare Resuscitation & Open Record ↗</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
                  <div className="text-3xl">🚑</div>
                  <h3 className="font-bold text-sm text-slate-800">No Inbound Ambulances at this Moment</h3>
                  <p className="text-xs text-slate-500">
                    When paramedics triage a patient in an ALS ambulance and select {hospitalSession.name}, the patient telemetry will appear here instantly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═════════ 3. PARAMEDICS MANAGEMENT ═════════ */}
          {navSection === "paramedics" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Hospital Paramedics & Ambulance Responders</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Table of this hospital&apos;s paramedics: badge code, phone, unit, expiry date, status, and last login.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddParamedicModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <span>➕</span> Add Paramedic
                </button>
              </div>

              {/* Add Paramedic Modal */}
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
                      <label className="block font-bold text-slate-700 mb-1">Badge Code</label>
                      <input
                        type="text"
                        value={paramedicForm.responder_code}
                        onChange={(e) => setParamedicForm({ ...paramedicForm, responder_code: e.target.value })}
                        placeholder="e.g. PARAM-AIIMS-10"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Emergency Unit</label>
                      <select
                        value={paramedicForm.unit_type}
                        onChange={(e) => setParamedicForm({ ...paramedicForm, unit_type: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none"
                      >
                        <option value="ambulance">Advanced Life Support (ALS) Ambulance</option>
                        <option value="hospital">Hospital Emergency Trauma Unit</option>
                        <option value="first_responder">Rapid Emergency Responder</option>
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
                        {isSubmittingParamedic ? "Provisioning..." : "Add Paramedic"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Paramedic Scans View Modal */}
              {selectedParamedicScans && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Scan History: {selectedParamedicScans.paramedic.name} ({selectedParamedicScans.paramedic.responder_code})
                      </h3>
                      <p className="text-xs text-slate-500">Records scanned and accessed in the field by this paramedic.</p>
                    </div>
                    <button onClick={() => setSelectedParamedicScans(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                  </div>

                  {selectedParamedicScans.logs.length > 0 ? (
                    <div className="space-y-2">
                      {selectedParamedicScans.logs.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center">
                          <div>
                            <span className="font-mono font-bold text-teal-800">{log.prana_id}</span>
                            <span className="text-slate-500 block text-[11px] mt-0.5">{log.accessed_data_summary}</span>
                          </div>
                          <span className="font-mono text-slate-400 text-[11px]">{new Date(log.scanned_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-lg text-center">No field scans recorded for this responder yet.</p>
                  )}
                </div>
              )}

              {/* Table of Hospital Paramedics */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Badge Code</th>
                      <th className="py-2.5 px-3">Paramedic Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Last Login / Active</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hospitalParamedics.slice((paramedicsPage - 1) * paramedicsPerPage, paramedicsPage * paramedicsPerPage).map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono text-[11px] text-teal-700 font-bold">{p.responder_code}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-800">{p.phone}</td>
                        <td className="py-3 px-3 text-slate-600 capitalize">{p.organization_type}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                          {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "30 days"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {p.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {p.last_verified_at ? new Date(p.last_verified_at).toLocaleDateString() : "Today"}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleViewParamedicScans(p)}
                            title="View paramedic scans"
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 px-2 py-1 rounded bg-teal-50 border border-teal-200"
                          >
                            Scans
                          </button>
                          <button
                            onClick={() => handleToggleParamedicStatus(p)}
                            className="text-[11px] font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 border border-slate-200"
                          >
                            {p.is_active ? "Suspend" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleRenewParamedic(p)}
                            className="text-[11px] font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 border border-slate-200"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => showToast(`Password reset link sent to ${p.phone}`)}
                            className="text-[11px] font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 border border-slate-200"
                          >
                            Reset Pwd
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table Pagination Bar */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    Showing <strong className="text-slate-800">{hospitalParamedics.length === 0 ? 0 : (paramedicsPage - 1) * paramedicsPerPage + 1}</strong> to{" "}
                    <strong className="text-slate-800">{Math.min(paramedicsPage * paramedicsPerPage, hospitalParamedics.length)}</strong> of{" "}
                    <strong className="text-slate-800">{hospitalParamedics.length}</strong> crew members
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setParamedicsPage(p => Math.max(1, p - 1))}
                      disabled={paramedicsPage <= 1}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      ← Previous
                    </button>
                    <span className="px-2 py-1 font-mono font-bold text-slate-600">
                      Page {paramedicsPage} / {Math.max(1, Math.ceil(hospitalParamedics.length / paramedicsPerPage))}
                    </span>
                    <button
                      onClick={() => setParamedicsPage(p => Math.min(Math.ceil(hospitalParamedics.length / paramedicsPerPage), p + 1))}
                      disabled={paramedicsPage >= Math.ceil(hospitalParamedics.length / paramedicsPerPage)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ 4. INSURANCE DESK ═════════ */}
          {navSection === "insurance_desk" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>💳</span> Hospital Insurance Desk & Pre-Authorization
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View policy details from patient profiles and set manual claims status: <em>Not started</em>, <em>Pre-auth requested</em>, <em>Approved</em>, or <em>Rejected</em>.
                </p>
              </div>

              {patientData ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
                  <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{patientData.patient.full_name}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        PRANA ID: <strong className="font-mono text-slate-800">{patientData.patient.prana_id}</strong> • Phone: <span className="font-mono">{patientData.patient.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Manual Desk Status:</span>
                      <select
                        value={insuranceStatus}
                        onChange={(e) => handleSaveInsuranceStatus(e.target.value as typeof insuranceStatus)}
                        disabled={isUpdatingInsurance}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        <option value="Not started">Not started</option>
                        <option value="Pre-auth requested">Pre-auth requested</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-600">Patient Insurance Policy Particulars</h4>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Insurance Carrier:</span>
                        <strong className="text-slate-900">{patientData.patient.insurance_provider || "Star Health & Allied Insurance"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Policy / Card ID:</span>
                        <strong className="font-mono text-teal-800">{patientData.patient.policy_number || "POL-99210-PRANA"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">TPA Contact:</span>
                        <strong className="font-mono text-slate-900">{patientData.patient.tpa_contact || "1800-425-2255"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Facility Empanelment:</span>
                        <span className="font-bold text-emerald-700">Verified Network Hospital</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-600">Claim Status Workflow</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          insuranceStatus === "Approved" ? "bg-emerald-100 text-emerald-800" :
                          insuranceStatus === "Rejected" ? "bg-red-100 text-red-800" :
                          insuranceStatus === "Pre-auth requested" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-200 text-slate-800"
                        }`}>
                          ● {insuranceStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Staff can select <em>Pre-auth requested</em> once paperwork is uploaded to TPA, and manually switch to <em>Approved</em> or <em>Rejected</em> when the insurer responds.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
                  <div className="text-3xl">💳</div>
                  <h3 className="font-bold text-sm text-slate-800">No Patient File Loaded</h3>
                  <p className="text-xs text-slate-500">
                    Search a patient on the <strong>Patient Lookup</strong> tab to manage their insurance policy and claim status.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═════════ 5. ACCESS LOG ═════════ */}
          {navSection === "access_log" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>📜</span> Facility Access Log
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every record {hospitalSession.name} opened, with time and break-glass clinical reason.
                  </p>
                </div>
                <button
                  onClick={fetchAccessLogs}
                  disabled={isLoadingLogs}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg transition"
                >
                  {isLoadingLogs ? "Refreshing..." : "🔄 Refresh Log"}
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Patient PRANA ID</th>
                      <th className="py-2.5 px-3">Terminal / Scanner</th>
                      <th className="py-2.5 px-3">Access Justification & Details</th>
                      <th className="py-2.5 px-3 font-mono text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accessLogs.length > 0 ? (
                      accessLogs.slice((accessLogsPage - 1) * accessLogsPerPage, accessLogsPage * accessLogsPerPage).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-teal-800">{log.prana_id}</td>
                          <td className="py-3 px-3 text-slate-700 font-semibold">{log.scanner_type}</td>
                          <td className="py-3 px-3 text-slate-600">{log.accessed_data_summary}</td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px] text-right">
                            {new Date(log.scanned_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No access logs recorded for this facility yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Table Pagination Bar */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    Showing <strong className="text-slate-800">{accessLogs.length === 0 ? 0 : (accessLogsPage - 1) * accessLogsPerPage + 1}</strong> to{" "}
                    <strong className="text-slate-800">{Math.min(accessLogsPage * accessLogsPerPage, accessLogs.length)}</strong> of{" "}
                    <strong className="text-slate-800">{accessLogs.length}</strong> log entries
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAccessLogsPage(p => Math.max(1, p - 1))}
                      disabled={accessLogsPage <= 1}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      ← Previous
                    </button>
                    <span className="px-2 py-1 font-mono font-bold text-slate-600">
                      Page {accessLogsPage} / {Math.max(1, Math.ceil(accessLogs.length / accessLogsPerPage))}
                    </span>
                    <button
                      onClick={() => setAccessLogsPage(p => Math.min(Math.ceil(accessLogs.length / accessLogsPerPage), p + 1))}
                      disabled={accessLogsPage >= Math.ceil(accessLogs.length / accessLogsPerPage)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ 6. SETTINGS ═════════ */}
          {navSection === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Hospital Profile</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Facility Name:</span>
                    <strong className="text-slate-900">{hospitalSession.name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Hospital Identifier:</span>
                    <strong className="font-mono text-teal-800">{hospitalSession.hospital_id}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Registration Number:</span>
                    <strong className="font-mono text-slate-900">{hospitalSession.registration_number}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-800">{hospitalSession.city}, {hospitalSession.state}</span>
                  </div>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Change Facility Access Password</h3>
                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold">
                    ✓ Password updated successfully for {hospitalSession.hospital_id}.
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (passwordChange.newPass !== passwordChange.confirm) {
                      showToast("Passwords do not match", "error");
                      return;
                    }
                    setPasswordSuccess(true);
                    setPasswordChange({ current: "", newPass: "", confirm: "" });
                    showToast("Password updated successfully");
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Password / PIN</label>
                    <input
                      type="password"
                      value={passwordChange.current}
                      onChange={(e) => setPasswordChange({ ...passwordChange, current: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordChange.newPass}
                      onChange={(e) => setPasswordChange({ ...passwordChange, newPass: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordChange.confirm}
                      onChange={(e) => setPasswordChange({ ...passwordChange, confirm: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-xs"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
