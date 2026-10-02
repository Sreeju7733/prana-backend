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

export default function SuperAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "hospitals" | "responders" | "patients" | "audit">("overview");

  // Data states
  const [stats, setStats] = useState<SystemStats>({
    total_hospitals: 0,
    active_hospitals: 0,
    total_responders: 0,
    active_responders: 0,
    total_patients: 0,
    total_scans: 0,
  });
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New Hospital Modal / Form
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [hospForm, setHospForm] = useState({
    name: "",
    registration_number: "",
    address: "",
    city: "New Delhi",
    state: "Delhi",
  });
  const [isSubmittingHosp, setIsSubmittingHosp] = useState(false);

  // New Responder Modal / Form
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

  // Toast / notification
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Initial fetch
  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, hospRes, respRes, patRes, logsRes] = await Promise.all([
        fetch("/api/admin/metrics").then((r) => r.json()),
        fetch("/api/hospitals").then((r) => r.json()),
        fetch("/api/responders").then((r) => r.json()),
        fetch("/api/admin/patients").then((r) => r.json()),
        fetch("/api/admin/audit-logs").then((r) => r.json()),
      ]);

      if (metricsRes.success) setStats(metricsRes.stats);
      if (hospRes.success) setHospitals(hospRes.data);
      if (respRes.success) setResponders(respRes.data);
      if (patRes.success) setPatients(patRes.data);
      if (logsRes.success) setAuditLogs(logsRes.data);
    } catch {
      showToast("Error loading system metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hospital Toggle Status
  const toggleHospitalStatus = async (hosp: Hospital) => {
    try {
      const res = await fetch("/api/hospitals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: hosp.id, is_active: !hosp.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setHospitals((prev) =>
          prev.map((h) => (h.id === hosp.id ? { ...h, is_active: !hosp.is_active } : h))
        );
        showToast(`Hospital ${hosp.name} status updated.`);
      }
    } catch {
      showToast("Failed to update hospital status.");
    }
  };

  // Responder Toggle Status
  const toggleResponderStatus = async (resp: Responder) => {
    try {
      const res = await fetch("/api/responders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resp.id, is_active: !resp.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setResponders((prev) =>
          prev.map((r) => (r.id === resp.id ? { ...r, is_active: !resp.is_active } : r))
        );
        showToast(`Responder ${resp.name} authorization toggled.`);
      }
    } catch {
      showToast("Failed to update responder status.");
    }
  };

  // Add Hospital Handler
  const handleAddHospital = async (e: React.FormEvent) => {
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
        setHospitals((prev) => [data.data, ...prev]);
        setShowAddHospital(false);
        setHospForm({ name: "", registration_number: "", address: "", city: "New Delhi", state: "Delhi" });
        showToast("Hospital enrolled into PRANA network!");
        fetchData();
      } else {
        showToast(data.error || "Failed to add hospital");
      }
    } catch {
      showToast("Error creating hospital");
    } finally {
      setIsSubmittingHosp(false);
    }
  };

  // Add Responder Handler
  const handleAddResponder = async (e: React.FormEvent) => {
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
        setResponders((prev) => [data.data, ...prev]);
        setShowAddResponder(false);
        setRespForm({
          name: "",
          phone: "",
          organization: "AIIMS New Delhi - Trauma & Emergency Center",
          organization_type: "hospital",
          responder_code: "",
          employee_id: "",
        });
        showToast("Paramedic Badge provisioned!");
        fetchData();
      } else {
        showToast(data.error || "Failed to provision badge");
      }
    } catch {
      showToast("Error creating responder");
    } finally {
      setIsSubmittingResp(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl animate-bounce flex items-center gap-2">
          <span>🔔</span> {notification}
        </div>
      )}

      {/* Superadmin Top Nav */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/40 text-xl font-bold">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PRANA Superadmin Console
                </span>
                <span className="text-[10px] bg-purple-950 border border-purple-700/60 text-purple-300 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Root Governance
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Hospital Network Governance & Paramedic Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 transition"
            >
              🚑 Paramedic Portal
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

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Hospitals</span>
            <div className="text-2xl font-black text-white">{stats.total_hospitals}</div>
            <span className="text-[10px] text-emerald-400 font-medium">● {stats.active_hospitals} Verified</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Responders</span>
            <div className="text-2xl font-black text-white">{stats.total_responders}</div>
            <span className="text-[10px] text-cyan-400 font-medium">● {stats.active_responders} Active</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Patients</span>
            <div className="text-2xl font-black text-white">{stats.total_patients}</div>
            <span className="text-[10px] text-purple-400 font-medium">PRANA Universal</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Scans</span>
            <div className="text-2xl font-black text-white">{stats.total_scans}</div>
            <span className="text-[10px] text-amber-400 font-medium">Audited & Logged</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Clearance</span>
            <div className="text-2xl font-black text-emerald-400">Green/Red</div>
            <span className="text-[10px] text-zinc-400 font-medium">3-Tier Guard</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Encryption</span>
            <div className="text-2xl font-black text-sky-400">Ed25519</div>
            <span className="text-[10px] text-zinc-400 font-medium">ECC AES-256</span>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "hospitals", label: "🏥 Hospitals Directory" },
            { id: "responders", label: "👨‍⚕️ Paramedic & Responders" },
            { id: "patients", label: "🪪 Registered Patients" },
            { id: "audit", label: "📜 Scan Audit Trail" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-purple-950/70 border border-purple-500/50 text-purple-300"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Verified Hospitals */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span>🏥</span> Enrolled Hospital Facilities
                </h3>
                <button
                  onClick={() => { setActiveTab("hospitals"); setShowAddHospital(true); }}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg transition"
                >
                  + Add Hospital
                </button>
              </div>

              <div className="divide-y divide-zinc-800">
                {hospitals.slice(0, 5).map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{h.name}</div>
                      <div className="text-xs text-zinc-400">
                        {h.city}, {h.state} • Reg: <span className="font-mono text-zinc-300">{h.registration_number}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.is_active
                          ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                          : "bg-red-950 border border-red-500/40 text-red-400"
                      }`}
                    >
                      {h.is_active ? "Active" : "Suspended"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Emergency Scans Log */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span> Live Emergency Access Stream
                </h3>
                <span className="text-xs font-mono text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
                  REAL-TIME AUDIT
                </span>
              </div>

              {auditLogs.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">{log.prana_id}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {log.access_tier || "Green Tier"}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {log.location_city || "Delhi"} • By: {log.responder_id || "Public Web Scanner"}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(log.scanned_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No scan logs recorded yet. Test scanning a patient card to populate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HOSPITALS MANAGEMENT */}
        {activeTab === "hospitals" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Verified Hospitals & Trauma Centers</h2>
                <p className="text-xs text-zinc-400">
                  Authorized healthcare facilities allowed to access Tier-2 & Tier-3 patient records.
                </p>
              </div>
              <button
                onClick={() => setShowAddHospital(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-900/30 flex items-center gap-2"
              >
                <span>➕</span> Enroll New Hospital
              </button>
            </div>

            {/* Add Hospital Modal */}
            {showAddHospital && (
              <div className="bg-zinc-900 border border-purple-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-purple-300 uppercase tracking-wider">
                    Register New Verified Hospital
                  </h3>
                  <button
                    onClick={() => setShowAddHospital(false)}
                    className="text-zinc-400 hover:text-white text-xs font-bold"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleAddHospital} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Hospital / Medical Center Name</label>
                    <input
                      type="text"
                      value={hospForm.name}
                      onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                      placeholder="e.g. Manipal Hospital Dwarka"
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

            {/* Hospitals Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Hospital Name & ID</th>
                      <th className="py-3 px-4">Registration #</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {hospitals.map((h) => (
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
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              h.is_active
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                : "bg-red-950 text-red-400 border border-red-500/40"
                            }`}
                          >
                            {h.is_active ? "Verified & Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleHospitalStatus(h)}
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

        {/* TAB 3: RESPONDERS & PARAMEDIC MANAGEMENT */}
        {activeTab === "responders" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Paramedic Badges & Emergency Responders</h2>
                <p className="text-xs text-zinc-400">
                  Provision verified credentials for ambulance paramedics and emergency room staff.
                </p>
              </div>
              <button
                onClick={() => setShowAddResponder(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-900/30 flex items-center gap-2"
              >
                <span>➕</span> Issue Paramedic Badge
              </button>
            </div>

            {/* Add Responder Modal */}
            {showAddResponder && (
              <div className="bg-zinc-900 border border-purple-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-purple-300 uppercase tracking-wider">
                    Provision Paramedic Badge & Responder Code
                  </h3>
                  <button
                    onClick={() => setShowAddResponder(false)}
                    className="text-zinc-400 hover:text-white text-xs font-bold"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleAddResponder} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Hospital / Organization</label>
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
                      <option value="General Emergency Medical Services (EMS)">General Emergency Services (EMS)</option>
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

            {/* Responders Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Responder Badge & Name</th>
                      <th className="py-3 px-4">Organization & Unit</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Status & Validity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {responders.map((r) => (
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
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                r.is_active
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                  : "bg-red-950 text-red-400 border border-red-500/40"
                              }`}
                            >
                              {r.is_active ? "Active" : "Suspended"}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            Exp: {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "30d"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleResponderStatus(r)}
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
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Registered PRANA Patients</h2>
              <p className="text-xs text-zinc-400">
                Universal patient health profiles secured with Ed25519 cryptography and multi-tier access guards.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Patient Name & PRANA ID</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Blood Group</th>
                      <th className="py-3 px-4">Health Records</th>
                      <th className="py-3 px-4">Card Status</th>
                      <th className="py-3 px-4 text-right">Public Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{p.full_name || "Patient Record"}</div>
                          <span className="font-mono text-[11px] text-cyan-400">{p.prana_id}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">{p.phone}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                            {p.blood_group || "B+"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          <span>{p.allergies_count} Allergies</span> •{" "}
                          <span>{p.medications_count} Medications</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.card_status === "active"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                : "bg-amber-950 text-amber-400 border border-amber-500/40"
                            }`}
                          >
                            {p.card_status || "Active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/p/${p.prana_id}`}
                            target="_blank"
                            className="text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800 transition"
                          >
                            View Bystander Tier →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SCAN AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Immutable Scan & Access Audit Trail</h2>
              <p className="text-xs text-zinc-400">
                Forensic record of all emergency QR card scans, responder lookups, and paramedic tier escalations.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">PRANA ID</th>
                      <th className="py-3 px-4">Access Tier</th>
                      <th className="py-3 px-4">Responder / Terminal</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Data Accessed</th>
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
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.access_tier?.toLowerCase().includes("red")
                                ? "bg-red-950 text-red-300 border border-red-800"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {log.access_tier || "Green Tier"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {log.responder_id || "Public Web Scanner"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {log.location_city || "Delhi, India"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate">
                          {log.accessed_data_summary || "Emergency Contacts & Critical Allergies"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
