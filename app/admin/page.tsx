"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Hospital {
  id: string;
  hospital_id: string;
  name: string;
  registration_number: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  is_active: boolean;
  staff_count?: number;
  created_at: string;
}

interface Responder {
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

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  prana_id: string;
  blood_group: string;
  gender: string;
  card_status: string;
  allergies_count: number;
  medications_count: number;
  created_at: string;
}

interface AuditLog {
  id: string;
  prana_id: string;
  access_tier: string;
  location_city: string;
  responder_id?: string;
  responder_org?: string;
  scanner_type: string;
  accessed_data_summary?: string;
  scanned_at: string;
}

interface SystemStats {
  total_hospitals: number;
  active_hospitals: number;
  total_responders: number;
  active_responders: number;
  total_patients: number;
  total_scans: number;
}

export default function ProfessionalSuperAdminDashboard() {
  // Sidenav selection
  const [activeNav, setActiveNav] = useState<"overview" | "hospitals" | "responders" | "patients" | "admissions" | "audit">("overview");

  // Filter query
  const [searchFilter, setSearchFilter] = useState("");

  // System Stats
  const [stats, setStats] = useState<SystemStats>({
    total_hospitals: 4,
    active_hospitals: 4,
    total_responders: 4,
    active_responders: 4,
    total_patients: 1,
    total_scans: 0,
  });

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [hospForm, setHospForm] = useState({
    name: "",
    registration_number: "",
    address: "",
    city: "New Delhi",
    state: "Delhi",
  });
  const [isSubmittingHosp, setIsSubmittingHosp] = useState(false);

  const [showAddResponder, setShowAddResponder] = useState(false);
  const [respForm, setRespForm] = useState({
    name: "",
    phone: "",
    organization: "AIIMS New Delhi - Trauma & Emergency Center",
    organization_type: "hospital",
    responder_code: "",
    employee_id: "",
  });
  const [isSubmittingResp, setIsSubmittingResp] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAllData = async () => {
    try {
      const [mRes, hRes, rRes, pRes, aRes] = await Promise.all([
        fetch("/api/admin/metrics").then(r => r.json()),
        fetch("/api/hospitals").then(r => r.json()),
        fetch("/api/responders").then(r => r.json()),
        fetch("/api/admin/patients").then(r => r.json()),
        fetch("/api/admin/audit-logs").then(r => r.json()),
      ]);

      if (mRes.success) setStats(mRes.stats);
      if (hRes.success) setHospitals(hRes.data);
      if (rRes.success) setResponders(rRes.data);
      if (pRes.success) setPatients(pRes.data);
      if (aRes.success) setAuditLogs(aRes.data);
    } catch {
      showToast("Error retrieving authority records", "error");
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleHospital = async (h: Hospital) => {
    try {
      const res = await fetch("/api/hospitals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: h.id, is_active: !h.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setHospitals(prev => prev.map(item => item.id === h.id ? { ...item, is_active: !h.is_active } : item));
        showToast(`Hospital ${h.name} status updated.`);
        loadAllData();
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleToggleResponder = async (r: Responder) => {
    try {
      const res = await fetch("/api/responders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setResponders(prev => prev.map(item => item.id === r.id ? { ...item, is_active: !r.is_active } : item));
        showToast(`Responder badge ${r.responder_code} toggled.`);
        loadAllData();
      }
    } catch {
      showToast("Failed to update badge status", "error");
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHosp(true);
    try {
      const res = await fetch("/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hospForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddHospital(false);
        setHospForm({ name: "", registration_number: "", address: "", city: "New Delhi", state: "Delhi" });
        showToast("Facility enrolled into PRANA network");
        loadAllData();
      } else {
        showToast(data.error || "Enrollment failed", "error");
      }
    } catch {
      showToast("Error creating hospital", "error");
    } finally {
      setIsSubmittingHosp(false);
    }
  };

  const handleCreateResponder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingResp(true);
    try {
      const res = await fetch("/api/responders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddResponder(false);
        setRespForm({
          name: "",
          phone: "",
          organization: "AIIMS New Delhi - Trauma & Emergency Center",
          organization_type: "hospital",
          responder_code: "",
          employee_id: "",
        });
        showToast("Paramedic Badge provisioned");
        loadAllData();
      } else {
        showToast(data.error || "Provisioning failed", "error");
      }
    } catch {
      showToast("Error issuing badge", "error");
    } finally {
      setIsSubmittingResp(false);
    }
  };

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    h.hospital_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredResponders = responders.filter(r =>
    r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.responder_code.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.organization.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.prana_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.phone.includes(searchFilter)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white antialiased">
      {/* Toast Alert */}
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
          {/* Logo Header */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              🛡️
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm text-slate-900">PRANA Governance</div>
              <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Superadmin Console</div>
            </div>
          </div>

          {/* Sidenav Navigation Items */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveNav("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "overview"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">📊</span>
              <span>Network Overview</span>
            </button>

            <button
              onClick={() => setActiveNav("hospitals")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "hospitals"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">🏥</span>
              <span>Hospitals Directory ({hospitals.length})</span>
            </button>

            <button
              onClick={() => setActiveNav("responders")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "responders"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">👨‍⚕️</span>
              <span>Paramedic Responders ({responders.length})</span>
            </button>

            <button
              onClick={() => setActiveNav("patients")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "patients"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">🪪</span>
              <span>Universal Patients ({patients.length})</span>
            </button>

            <button
              onClick={() => setActiveNav("admissions")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "admissions"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">📋</span>
              <span>Emergency & Shift Admissions</span>
            </button>

            <button
              onClick={() => setActiveNav("audit")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "audit"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">📜</span>
              <span>Forensic Audit Trail</span>
            </button>
          </nav>
        </div>

        {/* Sidenav Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="text-[11px] text-slate-500">
            System Root Operator: <strong className="text-slate-800 font-semibold block">National Health Authority</strong>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
            <Link href="/hospitals/login" className="text-slate-600 hover:text-indigo-700">
              🏥 Hospital EHR
            </Link>
            <Link href="/paramedic" className="text-slate-600 hover:text-indigo-700">
              🚑 Paramedic
            </Link>
            <Link href="/" className="text-slate-600 hover:text-indigo-700">
              API
            </Link>
          </div>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800 capitalize">
              {activeNav.replace("_", " ")}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-500">National Health Infrastructure Control</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search directory..."
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-600 w-52"
            />

            {activeNav === "hospitals" && (
              <button
                onClick={() => setShowAddHospital(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs"
              >
                + Enroll Hospital
              </button>
            )}

            {activeNav === "responders" && (
              <button
                onClick={() => setShowAddResponder(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs"
              >
                + Issue Badge
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* STATS METRIC ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Hospitals</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_hospitals}</div>
              <span className="text-[11px] text-emerald-700 font-semibold">● {stats.active_hospitals} Active</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Paramedics</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_responders}</div>
              <span className="text-[11px] text-slate-500 font-medium">Field Credentials</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Patients</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_patients}</div>
              <span className="text-[11px] text-slate-500 font-medium">Smart Cardholders</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Audit Logs</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_scans}</div>
              <span className="text-[11px] text-slate-500 font-medium">Forensic Records</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Clearance</span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">Green/Red</div>
              <span className="text-[11px] text-slate-500 font-medium">Tier Enforcement</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Encryption</span>
              <div className="text-2xl font-black text-indigo-700 mt-0.5">Ed25519</div>
              <span className="text-[11px] text-slate-500 font-medium">AES-256 GCM</span>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeNav === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrolled Hospitals Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Accredited Healthcare Facilities
                  </h3>
                  <button
                    onClick={() => { setActiveNav("hospitals"); setShowAddHospital(true); }}
                    className="text-xs text-indigo-700 font-bold hover:underline"
                  >
                    + Enroll Facility
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {hospitals.map(h => (
                    <div key={h.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{h.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{h.city}, {h.state} • {h.hospital_id}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        h.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {h.is_active ? "Active" : "Suspended"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Responders Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Emergency Paramedic Units
                  </h3>
                  <button
                    onClick={() => { setActiveNav("responders"); setShowAddResponder(true); }}
                    className="text-xs text-indigo-700 font-bold hover:underline"
                  >
                    + Issue Badge
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {responders.map(r => (
                    <div key={r.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{r.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{r.organization} • {r.responder_code}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.is_active ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {r.is_active ? "Authorized" : "Revoked"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOSPITALS */}
          {activeNav === "hospitals" && (
            <div className="space-y-4">
              {/* Add Hospital Modal */}
              {showAddHospital && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Enroll New Hospital</h3>
                    <button onClick={() => setShowAddHospital(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                  </div>

                  <form onSubmit={handleCreateHospital} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Hospital Name</label>
                      <input
                        type="text"
                        value={hospForm.name}
                        onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                        placeholder="e.g. Manipal Super Speciality Hospital"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Registration #</label>
                      <input
                        type="text"
                        value={hospForm.registration_number}
                        onChange={(e) => setHospForm({ ...hospForm, registration_number: e.target.value })}
                        placeholder="REG-DMC-2024-912"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={hospForm.city}
                        onChange={(e) => setHospForm({ ...hospForm, city: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddHospital(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingHosp}
                        className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition"
                      >
                        {isSubmittingHosp ? "Enrolling..." : "Enroll Hospital"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Facility Name & ID</th>
                      <th className="py-2.5 px-3">Registration #</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Accreditation</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHospitals.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{h.name}</div>
                          <span className="font-mono text-[11px] text-indigo-700">{h.hospital_id}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{h.registration_number}</td>
                        <td className="py-3 px-3 text-slate-600">{h.city}, {h.state}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            h.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {h.is_active ? "Accredited Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleHospital(h)}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 border border-slate-200"
                          >
                            {h.is_active ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RESPONDERS */}
          {activeNav === "responders" && (
            <div className="space-y-4">
              {/* Issue Badge Modal */}
              {showAddResponder && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Issue Paramedic Badge</h3>
                    <button onClick={() => setShowAddResponder(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                  </div>

                  <form onSubmit={handleCreateResponder} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Paramedic / Officer Name</label>
                      <input
                        type="text"
                        value={respForm.name}
                        onChange={(e) => setRespForm({ ...respForm, name: e.target.value })}
                        placeholder="e.g. Officer Anita Verma"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Official Mobile #</label>
                      <input
                        type="tel"
                        value={respForm.phone}
                        onChange={(e) => setRespForm({ ...respForm, phone: e.target.value })}
                        placeholder="9811223344"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none font-mono"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Assigned Hospital / Organization</label>
                      <select
                        value={respForm.organization}
                        onChange={(e) => setRespForm({ ...respForm, organization: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none"
                      >
                        {hospitals.map(h => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                        <option value="Emergency Medical Services (EMS)">Emergency Medical Services (EMS)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddResponder(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingResp}
                        className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition"
                      >
                        {isSubmittingResp ? "Issuing..." : "Issue Badge"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Responder & Badge</th>
                      <th className="py-2.5 px-3">Organization</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Clearance Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResponders.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <span className="font-mono text-[11px] text-indigo-700">{r.responder_code}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{r.organization}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{r.phone}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            r.is_active ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {r.is_active ? "Clearance Active" : "Revoked"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleResponder(r)}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 border border-slate-200"
                          >
                            {r.is_active ? "Revoke" : "Restore"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PATIENTS */}
          {activeNav === "patients" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Patient Name & PRANA ID</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Blood Group</th>
                    <th className="py-2.5 px-3">Health Profile Data</th>
                    <th className="py-2.5 px-3">Card Status</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{p.full_name || "Patient Profile"}</div>
                        <span className="font-mono text-[11px] text-teal-700 font-semibold">{p.prana_id}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{p.phone}</td>
                      <td className="py-3 px-3 font-bold text-red-700">{p.blood_group || "B+"}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.allergies_count} Allergies • {p.medications_count} Medications
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.card_status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {p.card_status || "active"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/hospitals/login"
                          className="text-xs font-bold text-indigo-700 hover:underline"
                        >
                          View in EHR →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: EMERGENCY & WARD ADMISSIONS (ACROSS HOSPITALS) */}
          {activeNav === "admissions" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Hospital Emergency & Ward Admissions (Active Shifts)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Centralized supervision of live casualty intakes, triage stages, and inpatient admissions across network facilities.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Live Intake Sync:</span>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Patient Name & PRANA ID</th>
                      <th className="py-2.5 px-3">Admitting Hospital</th>
                      <th className="py-2.5 px-3">Registered Mobile</th>
                      <th className="py-2.5 px-3">Age / Blood</th>
                      <th className="py-2.5 px-3">Triage & Admission Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">Sreeju S</div>
                        <span className="font-mono text-[11px] text-teal-700 font-semibold">PRAN-ba42c5c2</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">AIIMS New Delhi</div>
                        <span className="text-[10px] text-slate-500 font-mono">Trauma Resuscitation Bay 2</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">9489365108</td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600">19 Yrs • </span>
                        <strong className="text-red-700 font-bold">B+</strong>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Inpatient (Stable)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href="/hospitals/login" className="text-xs font-bold text-indigo-700 hover:underline">
                          Hospital View →
                        </Link>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">Kavita Ramachandran</div>
                        <span className="font-mono text-[11px] text-teal-700 font-semibold">PRAN-9921D8A2</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">Max Super Speciality Saket</div>
                        <span className="text-[10px] text-slate-500 font-mono">ICU Bed 04</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">9811223344</td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600">34 Yrs • </span>
                        <strong className="text-red-700 font-bold">O+</strong>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Active (Allergy Alert: Penicillin)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href="/hospitals/login" className="text-xs font-bold text-indigo-700 hover:underline">
                          Hospital View →
                        </Link>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">Rohan Varma</div>
                        <span className="font-mono text-[11px] text-teal-700 font-semibold">PRAN-4410A1B0</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">Indraprastha Apollo Hospitals</div>
                        <span className="text-[10px] text-slate-500 font-mono">Cardiology Stepdown</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">9876543210</td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600">48 Yrs • </span>
                        <strong className="text-red-700 font-bold">A+</strong>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Discharge Summary Pending
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href="/hospitals/login" className="text-xs font-bold text-indigo-700 hover:underline">
                          Hospital View →
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeNav === "audit" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">PRANA ID</th>
                    <th className="py-2.5 px-3">Clearance Tier</th>
                    <th className="py-2.5 px-3">Responder / Station</th>
                    <th className="py-2.5 px-3">Facility</th>
                    <th className="py-2.5 px-3">Data Accessed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-slate-500">{new Date(l.scanned_at).toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">{l.prana_id}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          l.access_tier?.toLowerCase().includes("red") ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {l.access_tier || "Green Tier"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{l.responder_id || l.scanner_type}</td>
                      <td className="py-3 px-3 text-slate-600">{l.location_city || "Hospital Unit"}</td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{l.accessed_data_summary || "Clinical file inspection"}</td>
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
