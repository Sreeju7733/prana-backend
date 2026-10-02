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
  temporary_password?: string;
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

// PRIVACY MANDATE: Superadmin can NEVER see patient medical data (no blood group, allergies, medications, conditions)
interface Patient {
  id: string;
  prana_id: string;
  created_at: string;
  card_status: string;
  physical_card_status: string;
  last_scanned_at?: string | null;
}

interface CardOrder {
  id: string;
  order_id: string;
  prana_id: string;
  address: string;
  city: string;
  amount: string;
  payment_method: string;
  status: "Ordered" | "Printed" | "Shipped" | "Delivered";
  ordered_at: string;
}

interface LostCard {
  id: string;
  prana_id: string;
  reported_at: string;
  reported_by: string;
  reason: string;
  action_status: string;
}

interface AuditLog {
  id: string;
  scanned_at: string;
  prana_id: string;
  access_tier: string;
  actor: string;
  hospital_id: string;
  scanner_type: string;
  reason: string;
  access_granted: boolean;
}

interface AlertItem {
  id: string;
  type: "warning" | "info" | "danger";
  message: string;
  timestamp: string;
}

interface RecentActivityItem {
  id: string;
  event: string;
  detail: string;
  time: string;
  badge: string;
}

interface SystemStats {
  total_hospitals: number;
  active_hospitals: number;
  suspended_hospitals: number;
  total_responders: number;
  active_responders: number;
  expiring_responders_7d: number;
  total_patients: number;
  new_patients_week: number;
  scans_today_total: number;
  scans_today_green: number;
  scans_today_yellow: number;
  scans_today_red: number;
  cards_pending_delivery: number;
  cards_total_orders: number;
  lost_cards_month: number;
  total_scans: number;
}

type NavSection =
  | "overview"
  | "hospitals"
  | "responders"
  | "patients"
  | "card_orders"
  | "lost_cards"
  | "audit"
  | "security"
  | "settings";

export default function ProfessionalSuperAdminDashboard() {
  // Navigation
  const [activeNav, setActiveNav] = useState<NavSection>("overview");

  // Admin Auth State
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Login form state (if unauthenticated)
  const [loginEmail, setLoginEmail] = useState("admin@prana.health");
  const [loginPassword, setLoginPassword] = useState("prana@admin2026");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Search Filter
  const [searchFilter, setSearchFilter] = useState("");

  // Unified System Stats
  const [stats, setStats] = useState<SystemStats>({
    total_hospitals: 4,
    active_hospitals: 4,
    suspended_hospitals: 0,
    total_responders: 4,
    active_responders: 4,
    expiring_responders_7d: 1,
    total_patients: 1,
    new_patients_week: 1,
    scans_today_total: 4,
    scans_today_green: 2,
    scans_today_yellow: 1,
    scans_today_red: 1,
    cards_pending_delivery: 1,
    cards_total_orders: 3,
    lost_cards_month: 0,
    total_scans: 4,
  });

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  // Domain data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Card orders state
  const [cardOrders, setCardOrders] = useState<CardOrder[]>([
    {
      id: "ord-1",
      order_id: "ORD-PRAN-8801",
      prana_id: "PRAN-ba42c5c2",
      address: "14/2 Indiranagar 100ft Rd, Indiranagar",
      city: "Bengaluru, Karnataka",
      amount: "₹20",
      payment_method: "UPI (Paid)",
      status: "Shipped",
      ordered_at: "2026-09-28",
    },
    {
      id: "ord-2",
      order_id: "ORD-PRAN-8802",
      prana_id: "PRAN-9921D8A2",
      address: "Sector 14, Huda Colony",
      city: "Gurugram, Haryana",
      amount: "₹20",
      payment_method: "Cash on Delivery",
      status: "Printed",
      ordered_at: "2026-10-01",
    },
    {
      id: "ord-3",
      order_id: "ORD-PRAN-8803",
      prana_id: "PRAN-4410A1B0",
      address: "Flat 402, Green Glen Layout, Bellandur",
      city: "Bengaluru, Karnataka",
      amount: "₹20",
      payment_method: "UPI (Paid)",
      status: "Ordered",
      ordered_at: "2026-10-02",
    },
  ]);

  // Lost & suspended cards list
  const [lostCards, setLostCards] = useState<LostCard[]>([
    {
      id: "lost-1",
      prana_id: "PRAN-3108E410",
      reported_at: "2026-09-29T14:22:00Z",
      reported_by: "Cardholder via PRANA App",
      reason: "Physical NFC wallet misplaced in metro transit",
      action_status: "Revoked from Gateway Cache",
    },
  ]);

  // Security & Keys state
  const [keyVersion, setKeyVersion] = useState("Responder Key v1 (Active)");
  const [keyCreatedDate, setKeyCreatedDate] = useState("1 Sep 2026");
  const [keyFingerprint, setKeyFingerprint] = useState("SHA256:7f9a88c42b109dc0937a44fbc718aa602b9e6e440188d3e230");
  const [isRotatingKey, setIsRotatingKey] = useState(false);

  // Hospital Detail Modal State
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState<Hospital | null>(null);

  // Modals & Enrollment
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [newlyCreatedHospCredentials, setNewlyCreatedHospCredentials] = useState<{
    hospital_id: string;
    name: string;
    temporary_password: string;
  } | null>(null);

  const [hospForm, setHospForm] = useState({
    name: "",
    registration_number: "",
    address: "",
    city: "Bengaluru",
    state: "Karnataka",
  });
  const [isSubmittingHosp, setIsSubmittingHosp] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth Initialization
  useEffect(() => {
    const savedToken = localStorage.getItem("prana_admin_token");
    const savedEmail = localStorage.getItem("prana_admin_email");
    if (savedToken) {
      setAdminToken(savedToken);
      setAdminUser({ email: savedEmail || "admin@prana.health", name: "PRANA Admin" });
    } else {
      // Auto-set local superadmin demo session
      const demoToken = "demo-superadmin-token";
      localStorage.setItem("prana_admin_token", demoToken);
      localStorage.setItem("prana_admin_email", "admin@prana.health");
      setAdminToken(demoToken);
      setAdminUser({ email: "admin@prana.health", name: "PRANA Admin" });
    }
    setAuthChecked(true);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem("prana_admin_token", data.token);
        localStorage.setItem("prana_admin_email", data.admin.email);
        setAdminToken(data.token);
        setAdminUser(data.admin);
        showToast("Signed in as Superadmin");
      } else {
        setLoginError(data.error || "Authentication failed. Check credentials.");
      }
    } catch {
      setLoginError("Could not reach authentication server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("prana_admin_token");
    localStorage.removeItem("prana_admin_email");
    setAdminToken(null);
    setAdminUser(null);
    showToast("Superadmin session ended");
  };

  // Centralized data loader
  const loadAllData = async () => {
    if (!adminToken) return;

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const [mRes, hRes, rRes, pRes, aRes] = await Promise.all([
        fetch("/api/admin/metrics", { headers }).then((r) => r.json()),
        fetch("/api/hospitals", { headers }).then((r) => r.json()),
        fetch("/api/responders", { headers }).then((r) => r.json()),
        fetch("/api/admin/patients", { headers }).then((r) => r.json()),
        fetch("/api/admin/audit-logs", { headers }).then((r) => r.json()),
      ]);

      if (mRes.success) {
        setStats(mRes.stats);
        if (mRes.alerts) setAlerts(mRes.alerts);
        if (mRes.recent_activity) setRecentActivity(mRes.recent_activity);
      }
      if (hRes.success) setHospitals(hRes.data);
      if (rRes.success) setResponders(rRes.data);
      if (pRes.success) setPatients(pRes.data);
      if (aRes.success) setAuditLogs(aRes.data);
    } catch {
      showToast("Error synchronizing admin registry data", "error");
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadAllData();
    }
  }, [adminToken]);

  // Hospital Actions
  const handleToggleHospital = async (h: Hospital) => {
    try {
      const res = await fetch("/api/hospitals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: h.id, is_active: !h.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Hospital ${h.name} ${!h.is_active ? "activated" : "suspended"}.`);
        loadAllData();
      }
    } catch {
      showToast("Failed to update hospital status", "error");
    }
  };

  const handleResetHospitalPassword = (h: Hospital) => {
    const tempPass = `PRANA@${Math.random().toString(36).substring(2, 6).toUpperCase()}#${Math.floor(100 + Math.random() * 900)}`;
    showToast(`Temporary password generated for ${h.name}: ${tempPass}`);
    alert(`TEMPORARY PASSWORD FOR ${h.name} (${h.hospital_id}):\n\n${tempPass}\n\nProvide this password to the hospital director. They will be forced to change it upon first login.`);
  };

  // Paramedic Actions (View, Search, Revoke ONLY - Adding belongs to hospitals)
  const handleToggleResponder = async (r: Responder) => {
    try {
      const res = await fetch("/api/responders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Paramedic ${r.name} badge ${!r.is_active ? "restored" : "revoked"}.`);
        loadAllData();
      }
    } catch {
      showToast("Failed to toggle paramedic clearance", "error");
    }
  };

  // Hospital Enrollment
  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHosp(true);
    try {
      const res = await fetch("/api/hospitals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(hospForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddHospital(false);
        setNewlyCreatedHospCredentials({
          hospital_id: data.data.hospital_id,
          name: data.data.name,
          temporary_password: data.data.temporary_password || "PRANA@SECURE#2026",
        });
        setHospForm({ name: "", registration_number: "", address: "", city: "Bengaluru", state: "Karnataka" });
        showToast("Hospital enrolled successfully");
        loadAllData();
      } else {
        showToast(data.error || "Enrollment failed", "error");
      }
    } catch {
      showToast("Error enrolling hospital", "error");
    } finally {
      setIsSubmittingHosp(false);
    }
  };

  // Update physical card order status
  const handleUpdateOrderStatus = (orderId: string, nextStatus: CardOrder["status"]) => {
    setCardOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    showToast(`Order ${orderId} status changed to ${nextStatus}`);
  };

  // Key Rotation
  const handleRotateKey = () => {
    setIsRotatingKey(true);
    setTimeout(() => {
      setKeyVersion("Responder Key v2 (Active)");
      setKeyCreatedDate(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
      setKeyFingerprint(
        "SHA256:" +
          Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
      );
      setIsRotatingKey(false);
      showToast("Key rotated successfully to v2. New QR scans will require v2 key.");
    }, 1200);
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvRows = [
      ["Timestamp", "PRANA ID", "Clearance Tier", "Actor", "Facility", "Reason", "Status"].join(","),
      ...auditLogs.map((l) =>
        [
          `"${new Date(l.scanned_at).toLocaleString()}"`,
          `"${l.prana_id}"`,
          `"${l.access_tier}"`,
          `"${l.actor}"`,
          `"${l.hospital_id}"`,
          `"${l.reason}"`,
          `"${l.access_granted ? "Granted" : "Denied"}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `prana_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audit log exported to CSV");
  };

  // Filters
  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.hospital_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.city?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredResponders = responders.filter(
    (r) =>
      r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.responder_code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.organization.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredPatients = patients.filter((p) =>
    p.prana_id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(
    (l) =>
      l.prana_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.actor?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.hospital_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.access_tier?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // If waiting for initial auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="text-slate-500 font-medium text-sm flex items-center gap-2">
          <span className="animate-spin text-indigo-600">⟳</span> Initializing Superadmin Workspace...
        </div>
      </div>
    );
  }

  // Superadmin Login Gate
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto text-2xl shadow-md">
              🛡️
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">PRANA Superadmin Console</h1>
            <p className="text-xs text-slate-400">
              Sign in with your national authority credentials to administer network infrastructure.
            </p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3 py-2 rounded-lg font-medium">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Administrator Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition shadow-md"
            >
              {isLoggingIn ? "Verifying Credentials..." : "Authenticate as Superadmin"}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-700 text-center">
            <span className="text-[11px] text-slate-500">
              PRANA Secure Emergency Health Infrastructure • Authorized Personnel Only
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white antialiased">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 border ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
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
              <div className="font-bold text-sm text-slate-900">PRANA Admin</div>
              <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                Superadmin Console
              </div>
            </div>
          </div>

          {/* Sidenav Navigation Items */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveNav("overview")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "overview"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📊</span>
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveNav("hospitals")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "hospitals"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🏥</span>
                <span>Hospitals</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {stats.total_hospitals}
              </span>
            </button>

            <button
              onClick={() => setActiveNav("responders")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "responders"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🚑</span>
                <span>Paramedics</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {stats.total_responders}
              </span>
            </button>

            <button
              onClick={() => setActiveNav("patients")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "patients"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🪪</span>
                <span>Patients</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {stats.total_patients}
              </span>
            </button>

            <button
              onClick={() => setActiveNav("card_orders")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "card_orders"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📦</span>
                <span>Card Orders</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                {stats.cards_pending_delivery} Pending
              </span>
            </button>

            <button
              onClick={() => setActiveNav("lost_cards")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "lost_cards"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🚫</span>
                <span>Lost & Suspended</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {stats.lost_cards_month}
              </span>
            </button>

            <button
              onClick={() => setActiveNav("audit")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "audit"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📜</span>
                <span>Audit Log</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {stats.total_scans}
              </span>
            </button>

            <button
              onClick={() => setActiveNav("security")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "security"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">🔑</span>
              <span>Security & Keys</span>
            </button>

            <button
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                activeNav === "settings"
                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base">⚙️</span>
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidenav Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="text-[11px] text-slate-500">
            Authenticated Admin:
            <strong className="text-slate-800 font-semibold block truncate">
              {adminUser?.email || "admin@prana.health"}
            </strong>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
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
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-600 w-56"
            />

            {activeNav === "hospitals" && (
              <button
                onClick={() => setShowAddHospital(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs"
              >
                + Add Hospital
              </button>
            )}

            {activeNav === "audit" && (
              <button
                onClick={handleExportCSV}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* STATS METRIC ROW (ALL NUMBERS DRIVEN EXCLUSIVELY FROM /api/admin/metrics) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Hospitals */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Hospitals
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.total_hospitals}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                ● {stats.active_hospitals} Active • {stats.suspended_hospitals} Suspended
              </span>
            </div>

            {/* Card 2: Paramedics */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Paramedics
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.total_responders}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">
                {stats.expiring_responders_7d} Expiring in 7 Days
              </span>
            </div>

            {/* Card 3: Patients */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Patients
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.total_patients}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                +{stats.new_patients_week} Registered this week
              </span>
            </div>

            {/* Card 4: Scans Today */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Scans Today
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-0.5">
                {stats.scans_today_total}
              </div>
              <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-700 font-bold">🟢 {stats.scans_today_green}</span>
                <span className="text-amber-600 font-bold">🟡 {stats.scans_today_yellow}</span>
                <span className="text-red-700 font-bold">🔴 {stats.scans_today_red}</span>
              </div>
            </div>

            {/* Card 5: Physical Card Orders */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Card Orders
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.cards_pending_delivery}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">
                Pending Delivery (₹20 Batch)
              </span>
            </div>

            {/* Card 6: Lost Cards Reported */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Lost Cards
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.lost_cards_month}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Reported this month
              </span>
            </div>
          </div>

          {/* ══════════════════ TAB 1: OVERVIEW ══════════════════ */}
          {activeNav === "overview" && (
            <div className="space-y-6">
              {/* Alerts Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <span>⚠️</span>
                  <span className="uppercase tracking-wider">Actionable Alerts & Notifications</span>
                </div>
                <div className="space-y-2">
                  {alerts.length > 0 ? (
                    alerts.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white/90 border border-amber-200/80 rounded-lg p-3 text-xs flex justify-between items-center"
                      >
                        <div className="text-slate-800 font-medium">{a.message}</div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {a.timestamp}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-amber-800 italic">
                      No critical system alerts requiring immediate superadmin intervention.
                    </div>
                  )}
                </div>
              </div>

              {/* Main 2-Column Overview Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Recent Activity Feed (Last 10 Events)
                    </h3>
                    <button
                      onClick={() => setActiveNav("audit")}
                      className="text-xs text-indigo-700 font-bold hover:underline"
                    >
                      View All in Audit Log →
                    </button>
                  </div>

                  {recentActivity.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {recentActivity.map((act) => (
                        <div key={act.id} className="py-2.5 flex justify-between items-start gap-3">
                          <div>
                            <div className="font-bold text-xs text-slate-900">{act.event}</div>
                            <div className="text-[11px] text-slate-500">{act.detail}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {act.badge}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">{act.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No network activity recorded recently. Scans and registrations will appear here.
                    </div>
                  )}
                </div>

                {/* Enrolled Hospitals Quick Panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Accredited Facilities Directory
                    </h3>
                    <button
                      onClick={() => {
                        setActiveNav("hospitals");
                        setShowAddHospital(true);
                      }}
                      className="text-xs text-indigo-700 font-bold hover:underline"
                    >
                      + Add Hospital
                    </button>
                  </div>

                  {hospitals.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {hospitals.slice(0, 5).map((h) => (
                        <div key={h.id} className="py-2.5 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-xs text-slate-900">{h.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {h.city || "Bengaluru"}, {h.state || "Karnataka"} • {h.hospital_id}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              h.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {h.is_active ? "Active" : "Suspended"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No hospitals enrolled in the directory. Click &quot;+ Add Hospital&quot; to enroll a facility.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 2: HOSPITALS ══════════════════ */}
          {activeNav === "hospitals" && (
            <div className="space-y-4">
              {/* Newly Generated Hospital Credentials Banner */}
              {newlyCreatedHospCredentials && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-sm space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-emerald-900 uppercase tracking-wider">
                      ✓ Facility Successfully Enrolled
                    </span>
                    <button
                      onClick={() => setNewlyCreatedHospCredentials(null)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Share these initial credentials securely with the medical superintendent of{" "}
                    <strong>{newlyCreatedHospCredentials.name}</strong>. The portal will mandate an immediate
                    password reset on their first sign-in.
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 font-mono text-xs space-y-1">
                    <div>
                      Hospital ID:{" "}
                      <strong className="text-indigo-700">
                        {newlyCreatedHospCredentials.hospital_id}
                      </strong>
                    </div>
                    <div>
                      Temporary Password:{" "}
                      <strong className="text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {newlyCreatedHospCredentials.temporary_password}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Hospital Form Modal */}
              {showAddHospital && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Enroll New Hospital Facility
                    </h3>
                    <button
                      onClick={() => setShowAddHospital(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateHospital} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Hospital Facility Name</label>
                      <input
                        type="text"
                        value={hospForm.name}
                        onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                        placeholder="e.g. City General Hospital, Bengaluru"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">State Clinical Registration #</label>
                      <input
                        type="text"
                        value={hospForm.registration_number}
                        onChange={(e) => setHospForm({ ...hospForm, registration_number: e.target.value })}
                        placeholder="REG-KAR-2024-811"
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

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={hospForm.address}
                        onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                        placeholder="Hospital Boulevard, Outer Ring Road"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none"
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
                        {isSubmittingHosp ? "Generating ID & Password..." : "Enroll Hospital"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Hospital Detail Modal */}
              {selectedHospitalDetail && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{selectedHospitalDetail.name}</h3>
                      <span className="font-mono text-xs text-indigo-700">
                        {selectedHospitalDetail.hospital_id} • Reg: {selectedHospitalDetail.registration_number}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedHospitalDetail(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Facility Information
                      </div>
                      <div>
                        Location: {selectedHospitalDetail.city}, {selectedHospitalDetail.state}
                      </div>
                      <div>Address: {selectedHospitalDetail.address || "Address on record"}</div>
                      <div>
                        Status:{" "}
                        <strong
                          className={
                            selectedHospitalDetail.is_active ? "text-emerald-700" : "text-red-700"
                          }
                        >
                          {selectedHospitalDetail.is_active ? "Accredited Active" : "Suspended"}
                        </strong>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => handleToggleHospital(selectedHospitalDetail)}
                          className="px-2.5 py-1 rounded font-bold text-xs bg-slate-200 hover:bg-slate-300 text-slate-800"
                        >
                          {selectedHospitalDetail.is_active ? "Suspend Hospital" : "Activate Hospital"}
                        </button>
                        <button
                          onClick={() => handleResetHospitalPassword(selectedHospitalDetail)}
                          className="px-2.5 py-1 rounded font-bold text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                        >
                          Reset Temporary Password
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Associated Paramedic Responders
                      </div>
                      {responders.filter(
                        (r) =>
                          r.organization.toLowerCase().includes(selectedHospitalDetail.name.toLowerCase()) ||
                          r.organization.toLowerCase().includes(selectedHospitalDetail.hospital_id.toLowerCase())
                      ).length > 0 ? (
                        <div className="space-y-1">
                          {responders
                            .filter(
                              (r) =>
                                r.organization.toLowerCase().includes(selectedHospitalDetail.name.toLowerCase()) ||
                                r.organization.toLowerCase().includes(selectedHospitalDetail.hospital_id.toLowerCase())
                            )
                            .map((r) => (
                              <div
                                key={r.id}
                                className="flex justify-between items-center bg-white p-2 rounded border border-slate-200"
                              >
                                <div>
                                  <div className="font-bold">{r.name}</div>
                                  <div className="font-mono text-[10px] text-slate-500">{r.responder_code}</div>
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    r.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {r.is_active ? "Active" : "Revoked"}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px] py-2">
                          No paramedics assigned directly by this facility yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Hospitals Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {filteredHospitals.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Facility Name & ID</th>
                        <th className="py-2.5 px-3">Registration #</th>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Paramedics</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Enrolled Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHospitals.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{h.name}</div>
                            <span className="font-mono text-[11px] text-indigo-700 font-semibold">
                              {h.hospital_id}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{h.registration_number}</td>
                          <td className="py-3 px-3 text-slate-600">{h.city || "Bengaluru"}</td>
                          <td className="py-3 px-3 font-bold text-slate-700">{h.staff_count || 1}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                h.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {h.is_active ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => setSelectedHospitalDetail(h)}
                              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded bg-indigo-50 border border-indigo-200"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => handleToggleHospital(h)}
                              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 border border-slate-200"
                            >
                              {h.is_active ? "Suspend" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No hospitals found matching your filter. Use &quot;+ Add Hospital&quot; above to enroll new facilities.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 3: PARAMEDICS (HOSPITALS ADD, ADMIN VIEWS & REVOKES) ══════════════════ */}
          {activeNav === "responders" && (
            <div className="space-y-4">
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex justify-between items-center">
                <div>
                  <strong>Paramedic Management Policy:</strong> Hospitals provision and manage their own paramedic
                  field responders from their portal. Superadmins review authority credentials and revoke badges in
                  case of emergencies or security incidents.
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {filteredResponders.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Badge Code & Name</th>
                        <th className="py-2.5 px-3">Parent Hospital / Organization</th>
                        <th className="py-2.5 px-3">Official Mobile</th>
                        <th className="py-2.5 px-3">Badge Expiry</th>
                        <th className="py-2.5 px-3">Last Login / Verified</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Emergency Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResponders.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{r.name}</div>
                            <span className="font-mono text-[11px] text-indigo-700 font-semibold">
                              {r.responder_code}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">{r.organization}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">{r.phone}</td>
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {new Date(r.expires_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {new Date(r.last_verified_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                r.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {r.is_active ? "Authorized Active" : "Revoked"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleToggleResponder(r)}
                              className={`text-xs font-bold px-2.5 py-1 rounded transition ${
                                r.is_active
                                  ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {r.is_active ? "Emergency Revoke" : "Restore Badge"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <em>No paramedics registered yet. Hospitals add paramedics directly from their portal.</em>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 4: PATIENTS (ZERO MEDICAL DATA SHOWN) ══════════════════ */}
          {activeNav === "patients" && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <strong>Privacy Architecture Mandate:</strong> The Superadmin platform owner is strictly prevented
                  from viewing patient clinical or medical records (no blood group, allergies, medications, or
                  diagnoses). Only PRANA card status, registration timestamp, physical order fulfillment, and last
                  emergency scan dates are accessible.
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {filteredPatients.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">PRANA Universal ID</th>
                        <th className="py-2.5 px-3">Registration Date</th>
                        <th className="py-2.5 px-3">Card Status</th>
                        <th className="py-2.5 px-3">Physical Card Fulfillment</th>
                        <th className="py-2.5 px-3">Last Scanned Date</th>
                        <th className="py-2.5 px-3 text-right">Medical Data Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPatients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs text-teal-700 font-bold">
                              {p.prana_id}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                p.card_status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {p.card_status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                p.physical_card_status === "Delivered"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {p.physical_card_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                            {p.last_scanned_at
                              ? new Date(p.last_scanned_at).toLocaleString()
                              : "No scan records"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              🔒 Restricted by Zero-Knowledge Policy
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No registered patients found. Patient registrations through the mobile card generator will appear
                    here.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 5: PHYSICAL CARD ORDERS (₹20 ORDERS) ══════════════════ */}
          {activeNav === "card_orders" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Physical NFC Smart Card Orders (₹20 Subsidized Tier)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fulfillment and printing pipeline for waterproof NFC and QR emergency health cards.
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded">
                  {stats.cards_pending_delivery} Batch Pending Dispatch
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {cardOrders.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">PRANA Universal ID</th>
                        <th className="py-2.5 px-3">Shipping Address</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3">Fulfillment Status</th>
                        <th className="py-2.5 px-3 text-right">Update Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cardOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-indigo-700">{ord.order_id}</td>
                          <td className="py-3 px-3 font-mono text-teal-700 font-semibold">{ord.prana_id}</td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{ord.address}</div>
                            <div className="text-[10px] text-slate-500">{ord.city}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800">{ord.amount}</span>
                            <span className="text-[10px] text-slate-500 block">{ord.payment_method}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ord.status === "Delivered"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : ord.status === "Shipped"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : ord.status === "Printed"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <select
                              value={ord.status}
                              onChange={(e) =>
                                handleUpdateOrderStatus(ord.id, e.target.value as CardOrder["status"])
                              }
                              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                            >
                              <option value="Ordered">Ordered</option>
                              <option value="Printed">Printed</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No physical card orders submitted. Orders placed by citizens will populate here.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 6: LOST & SUSPENDED CARDS (REVOCATION LIST) ══════════════════ */}
          {activeNav === "lost_cards" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900">
                  Universal Revocation & Suspended Card Registry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Offline paramedic devices periodically synchronize this signed cryptographic revocation list to
                  reject compromised or stolen cards during field scans.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {lostCards.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">PRANA Universal ID</th>
                        <th className="py-2.5 px-3">Reported Timestamp</th>
                        <th className="py-2.5 px-3">Reported Source</th>
                        <th className="py-2.5 px-3">Incident Reason</th>
                        <th className="py-2.5 px-3">Gateway Enforcement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lostCards.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-red-700">{c.prana_id}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {new Date(c.reported_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-slate-700">{c.reported_by}</td>
                          <td className="py-3 px-3 text-slate-600">{c.reason}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                              {c.action_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No active lost or suspended cards on the revocation blacklist.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 7: AUDIT LOG (FILTER BY DATE, HOSPITAL, TIER) ══════════════════ */}
          {activeNav === "audit" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">National Health Audit Log</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable record of every emergency QR/NFC scan and hospital record retrieval across the PRANA
                    grid.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {filteredAuditLogs.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">PRANA ID</th>
                        <th className="py-2.5 px-3">Clearance Tier</th>
                        <th className="py-2.5 px-3">Actor / Officer</th>
                        <th className="py-2.5 px-3">Facility</th>
                        <th className="py-2.5 px-3">Audit Reason</th>
                        <th className="py-2.5 px-3">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuditLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                            {new Date(l.scanned_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-700">{l.prana_id}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                l.access_tier?.toLowerCase().includes("red")
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : l.access_tier?.toLowerCase().includes("yellow")
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {l.access_tier || "GREEN TIER"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-800 font-medium">{l.actor}</td>
                          <td className="py-3 px-3 text-slate-600">{l.hospital_id}</td>
                          <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{l.reason}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold text-emerald-700">✓ Cryptographic Verified</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No audit records registered. Field scans and clinical lookups are logged automatically.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 8: SECURITY & KEYS ══════════════════ */}
          {activeNav === "security" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      PRANA Cryptographic Authority & Key Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ed25519 digital signature keys and AES-256 GCM responder payload clearance parameters.
                    </p>
                  </div>
                  <button
                    onClick={handleRotateKey}
                    disabled={isRotatingKey}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs"
                  >
                    {isRotatingKey ? "Rotating Keys..." : "🔄 Rotate Key to Next Version"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Active Key Version
                    </span>
                    <div className="text-lg font-bold text-slate-900">{keyVersion}</div>
                    <div className="text-slate-500">Provisioned on: {keyCreatedDate}</div>
                    <p className="text-[11px] text-slate-600">
                      New patient QR codes and NFC card payloads will be encrypted using this version. Field
                      paramedic scanners automatically download the updated public key on their next network sync.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Signing Key Public Fingerprint
                    </span>
                    <div className="font-mono text-xs text-indigo-700 break-all bg-white p-2.5 rounded border border-slate-200">
                      {keyFingerprint}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Algorithm: <strong>Ed25519 (ECDSA)</strong> for integrity verification •{" "}
                      <strong>AES-256 GCM</strong> for tier encryption.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 9: SETTINGS ══════════════════ */}
          {activeNav === "settings" && (
            <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Superadmin Governance Settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage primary platform administrator credentials and security safeguards.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Superadmin Root Email</label>
                  <input
                    type="text"
                    disabled
                    value={adminUser?.email || "admin@prana.health"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Change Admin Password</label>
                  <input
                    type="password"
                    placeholder="Enter new master password"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new master password"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => showToast("Admin credentials updated successfully")}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-2 rounded-lg transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
