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

export default function EnterpriseSuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "hospitals" | "responders" | "patients" | "audit">("overview");

  // Filter / Search states
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
  const [loading, setLoading] = useState(true);

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

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
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
      showToast("Error synchronizing administrative telemetry", "error");
    } finally {
      setLoading(false);
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
        showToast(`Hospital accreditation ${!h.is_active ? "restored to Active" : "suspended"}`);
        loadAllData();
      }
    } catch {
      showToast("Failed to modify hospital accreditation status", "error");
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
        showToast(`Paramedic badge ${!r.is_active ? "re-authorized" : "revoked"}`);
        loadAllData();
      }
    } catch {
      showToast("Failed to modify responder status", "error");
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
        showToast("Hospital officially accredited and enrolled into PRANA network");
        loadAllData();
      } else {
        showToast(data.error || "Enrollment failed", "error");
      }
    } catch {
      showToast("Error creating hospital record", "error");
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
        showToast("Paramedic Badge provisioned with Red Tier Emergency Clearance");
        loadAllData();
      } else {
        showToast(data.error || "Provisioning failed", "error");
      }
    } catch {
      showToast("Error provisioning responder badge", "error");
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Toast popup */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce border ${
          toast.type === "error" ? "bg-red-950 border-red-700 text-red-200" :
          toast.type === "info" ? "bg-blue-950 border-blue-700 text-blue-200" :
          "bg-purple-900 border-purple-600 text-white"
        }`}>
          <span>{toast.type === "error" ? "⚠️" : "🔔"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-900/40">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white">
                  PRANA • National Health Authority Superadmin
                </span>
                <span className="text-[10px] bg-purple-950 border border-purple-600/70 text-purple-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Root Governance
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Hospital Network Accreditation & Paramedic Emergency Dispatch Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospitals"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-700/60 text-teal-300 transition flex items-center gap-1.5"
            >
              <span>🏥</span> Hospital EHR
            </Link>
            <Link
              href="/paramedic"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-300 transition flex items-center gap-1.5"
            >
              <span>🚑</span> Paramedic App
            </Link>
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              API Docs
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Hospitals Enrolled</span>
            <div className="text-2xl font-black text-white">{stats.total_hospitals}</div>
            <span className="text-[10px] text-emerald-400 font-semibold">● {stats.active_hospitals} Verified Active</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Active Paramedics</span>
            <div className="text-2xl font-black text-cyan-400">{stats.total_responders}</div>
            <span className="text-[10px] text-zinc-400 font-semibold">● Field Units Provisioned</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">PRANA Patients</span>
            <div className="text-2xl font-black text-white">{stats.total_patients}</div>
            <span className="text-[10px] text-purple-400 font-semibold">Universal Smart Cards</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Security Audits</span>
            <div className="text-2xl font-black text-amber-400">{stats.total_scans}</div>
            <span className="text-[10px] text-zinc-400 font-semibold">Forensically Logged</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Access Clearance</span>
            <div className="text-2xl font-black text-emerald-400">Green / Red</div>
            <span className="text-[10px] text-zinc-400 font-semibold">Multi-Tier Protected</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Cryptography</span>
            <div className="text-2xl font-black text-indigo-400">Ed25519</div>
            <span className="text-[10px] text-zinc-400 font-semibold">ECC AES-256 GCM</span>
          </div>
        </div>

        {/* Global Toolbar & Search Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
            {[
              { id: "overview", label: "📊 Operations Overview" },
              { id: "hospitals", label: `🏥 Hospital Directory (${hospitals.length})` },
              { id: "responders", label: `👨‍⚕️ Emergency Responders (${responders.length})` },
              { id: "patients", label: `🪪 Registered Patients (${patients.length})` },
              { id: "audit", label: "📜 Forensic Access Stream" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-purple-950 border border-purple-600/70 text-purple-300 shadow"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by name, ID, or city..."
              className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 w-64"
            />

            {activeTab === "hospitals" && (
              <button
                onClick={() => setShowAddHospital(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow"
              >
                <span>➕</span> Enroll Hospital
              </button>
            )}

            {activeTab === "responders" && (
              <button
                onClick={() => setShowAddResponder(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow"
              >
                <span>➕</span> Issue Paramedic Badge
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: OPERATIONS OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Accredited Hospitals Summary */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span>🏥</span> Accredited Healthcare Facilities
                </h3>
                <button
                  onClick={() => setShowAddHospital(true)}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-lg transition"
                >
                  + Enroll Facility
                </button>
              </div>

              <div className="divide-y divide-zinc-800">
                {hospitals.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{h.name}</div>
                      <div className="text-xs text-zinc-400">
                        {h.city}, {h.state} • ID: <span className="font-mono text-purple-400">{h.hospital_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        h.is_active
                          ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                          : "bg-red-950 border border-red-500/40 text-red-400"
                      }`}>
                        {h.is_active ? "Accredited" : "Suspended"}
                      </span>
                      <button
                        onClick={() => handleToggleHospital(h)}
                        className="text-[11px] font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
                      >
                        {h.is_active ? "Suspend" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Verified Responders and Live Scanner Feed */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span>👨‍⚕️</span> Emergency Paramedic Field Units
                </h3>
                <button
                  onClick={() => setShowAddResponder(true)}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-lg transition"
                >
                  + Issue Badge
                </button>
              </div>

              <div className="divide-y divide-zinc-800">
                {responders.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{r.name}</div>
                      <div className="text-xs text-zinc-400">
                        {r.organization} • Badge: <span className="font-mono text-cyan-400">{r.responder_code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        r.is_active
                          ? "bg-cyan-950 border border-cyan-500/40 text-cyan-400"
                          : "bg-red-950 border border-red-500/40 text-red-400"
                      }`}>
                        {r.is_active ? "Clearance Active" : "Revoked"}
                      </span>
                      <button
                        onClick={() => handleToggleResponder(r)}
                        className="text-[11px] font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
                      >
                        {r.is_active ? "Revoke" : "Restore"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOSPITALS MANAGEMENT */}
        {activeTab === "hospitals" && (
          <div className="space-y-4">
            {/* Modal: Enroll Hospital */}
            {showAddHospital && (
              <div className="bg-zinc-900 border border-purple-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-purple-300 uppercase tracking-wider">
                    Accredit New Hospital Facility
                  </h3>
                  <button onClick={() => setShowAddHospital(false)} className="text-zinc-400 hover:text-white font-bold text-xs">
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleCreateHospital} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Hospital / Medical Center Name</label>
                    <input
                      type="text"
                      value={hospForm.name}
                      onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                      placeholder="e.g. Manipal Super Speciality Hospital"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">State / Central Registration Number</label>
                    <input
                      type="text"
                      value={hospForm.registration_number}
                      onChange={(e) => setHospForm({ ...hospForm, registration_number: e.target.value })}
                      placeholder="e.g. REG-DMC-2024-912"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">City</label>
                    <input
                      type="text"
                      value={hospForm.city}
                      onChange={(e) => setHospForm({ ...hospForm, city: e.target.value })}
                      placeholder="e.g. New Delhi"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={hospForm.address}
                      onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                      placeholder="e.g. Sector 6, Dwarka"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddHospital(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingHosp}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition shadow"
                    >
                      {isSubmittingHosp ? "Enrolling..." : "Enroll Hospital"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Hospital Name & ID</th>
                      <th className="py-3 px-4">Registration #</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Accreditation Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredHospitals.map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{h.name}</div>
                          <span className="font-mono text-[11px] text-purple-400">{h.hospital_id}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">
                          {h.registration_number}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {h.city}, {h.state}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            h.is_active
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                              : "bg-red-950 text-red-400 border border-red-500/40"
                          }`}>
                            {h.is_active ? "Verified & Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleHospital(h)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                              h.is_active
                                ? "bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300"
                                : "bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300"
                            }`}
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
          </div>
        )}

        {/* TAB 3: RESPONDERS MANAGEMENT */}
        {activeTab === "responders" && (
          <div className="space-y-4">
            {/* Modal: Issue Badge */}
            {showAddResponder && (
              <div className="bg-zinc-900 border border-purple-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-purple-300 uppercase tracking-wider">
                    Provision Paramedic Badge & Responder Code
                  </h3>
                  <button onClick={() => setShowAddResponder(false)} className="text-zinc-400 hover:text-white font-bold text-xs">
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleCreateResponder} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Paramedic / Officer Name</label>
                    <input
                      type="text"
                      value={respForm.name}
                      onChange={(e) => setRespForm({ ...respForm, name: e.target.value })}
                      placeholder="e.g. Officer Anita Verma"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Official Mobile Number</label>
                    <input
                      type="tel"
                      value={respForm.phone}
                      onChange={(e) => setRespForm({ ...respForm, phone: e.target.value })}
                      placeholder="e.g. 9811223344"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Assigned Hospital / Organization</label>
                    <select
                      value={respForm.organization}
                      onChange={(e) => setRespForm({ ...respForm, organization: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-purple-500"
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name}
                        </option>
                      ))}
                      <option value="Emergency Medical Services (EMS)">Emergency Medical Services (EMS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Unit Type</label>
                    <select
                      value={respForm.organization_type}
                      onChange={(e) => setRespForm({ ...respForm, organization_type: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-purple-500"
                    >
                      <option value="ambulance">Ambulance Paramedic</option>
                      <option value="hospital">Hospital Trauma Center</option>
                      <option value="police">Police Emergency Responder</option>
                      <option value="fire">Fire & Rescue Service</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddResponder(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingResp}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition shadow"
                    >
                      {isSubmittingResp ? "Provisioning..." : "Issue Badge"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Responder Badge & Name</th>
                      <th className="py-3 px-4">Organization & Unit</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status & Validity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredResponders.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{r.name}</div>
                          <span className="font-mono text-[11px] text-cyan-400">
                            {r.responder_code} • {r.employee_id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          <div>{r.organization}</div>
                          <span className="text-[10px] text-zinc-500 capitalize">{r.organization_type}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">{r.phone}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.is_active
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                              : "bg-red-950 text-red-400 border border-red-500/40"
                          }`}>
                            {r.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleResponder(r)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                              r.is_active
                                ? "bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300"
                                : "bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300"
                            }`}
                          >
                            {r.is_active ? "Revoke Badge" : "Re-activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REGISTERED PATIENTS */}
        {activeTab === "patients" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Patient Name & PRANA ID</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Clinical Data Count</th>
                    <th className="py-3 px-4">Card Status</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{p.full_name || "Patient Record"}</div>
                        <span className="font-mono text-[11px] text-teal-400">{p.prana_id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-300">{p.phone}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded border border-red-800">
                          {p.blood_group || "B+"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        <span>{p.allergies_count} Allergies</span> •{" "}
                        <span>{p.medications_count} Medications</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.card_status === "active"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : "bg-amber-950 text-amber-400 border border-amber-500/40"
                        }`}>
                          {p.card_status || "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/hospitals`}
                          className="text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800 transition"
                        >
                          View in Hospital EHR →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: FORENSIC AUDIT STREAM */}
        {activeTab === "audit" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">PRANA ID</th>
                    <th className="py-3 px-4">Access Tier</th>
                    <th className="py-3 px-4">Terminal / Responder</th>
                    <th className="py-3 px-4">Facility / Location</th>
                    <th className="py-3 px-4">Summary of Data Inspected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-400">
                        {new Date(log.scanned_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        {log.prana_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.access_tier?.toLowerCase().includes("red")
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}>
                          {log.access_tier || "Green Tier"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {log.responder_id || log.scanner_type || "Hospital Workstation"}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {log.location_city || "Emergency Trauma Center"}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate">
                        {log.accessed_data_summary || "Full Clinical Record Access"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
