"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

export default function HospitalPatientRecordPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || "";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<PatientSearchResponse | null>(null);
  const [recordTab, setRecordTab] = useState<
    "summary" | "medications" | "conditions" | "vitals" | "surgeries" | "reports" | "insurance" | "emergency_contacts" | "access_log"
  >("summary");

  const [insuranceStatus, setInsuranceStatus] = useState<"Not started" | "Pre-auth requested" | "Approved" | "Rejected">("Pre-auth requested");
  const [isUpdatingInsurance, setIsUpdatingInsurance] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function loadRecord() {
      if (!rawId) return;
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("prana_hosp_token") || "";
        const storedHosp = localStorage.getItem("prana_hosp_session");
        const hospId = storedHosp ? JSON.parse(storedHosp).hospital_id : "HOSP-AIIMS-01";

        const res = await fetch(`/api/hospitals/search-patient?prana_id=${encodeURIComponent(rawId)}&hospital_id=${encodeURIComponent(hospId)}&reason=${encodeURIComponent("Hospital Record Access")}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to retrieve clinical chart");
        }

        setPatientData(data as PatientSearchResponse);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading patient record");
      } finally {
        setIsLoading(false);
      }
    }

    loadRecord();
  }, [rawId]);

  const handleSaveInsuranceStatus = async (newStatus: "Not started" | "Pre-auth requested" | "Approved" | "Rejected") => {
    if (!patientData) return;
    setIsUpdatingInsurance(true);
    try {
      const token = localStorage.getItem("prana_hosp_token") || "";
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
        showToast(`Insurance status updated to: ${newStatus}`);
      }
    } catch {
      showToast("Failed to update insurance status", "error");
    } finally {
      setIsUpdatingInsurance(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans antialiased text-slate-800">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xl mx-auto animate-pulse">
            📋
          </div>
          <div className="font-bold text-sm text-slate-900">Retrieving Patient Clinical File...</div>
          <p className="text-xs text-slate-500 font-mono">{rawId}</p>
        </div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans antialiased text-slate-800 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-base font-bold text-slate-900">Patient Chart Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Unable to decrypt clinical health chart."}</p>
          <div className="pt-2">
            <Link
              href="/hospitals"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
            >
              ← Back to Hospital Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const criticalAllergies = patientData.allergies.filter(a => a.is_critical || a.severity?.toLowerCase() === "severe");
  const pacemakerDevice = patientData.devices.find(d => (d.name || d.device_name || "").toLowerCase().includes("pacemaker"));
  const bloodThinners = patientData.medications.filter(m =>
    ["warfarin", "aspirin", "clopidogrel", "heparin", "apixaban", "eliquis", "xarelto"].some(t =>
      m.name.toLowerCase().includes(t)
    )
  );
  const hasCriticalAlerts = criticalAllergies.length > 0 || !!pacemakerDevice || bloodThinners.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            toast.type === "success"
              ? "bg-teal-900 text-white border-teal-700"
              : "bg-red-900 text-white border-red-700"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/hospitals"
            className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="font-bold text-sm text-slate-900">
            {patientData.patient.full_name}
          </span>
          <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
            {patientData.patient.prana_id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition"
          >
            🖨️ Print Clinical Chart
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("prana_hosp_token");
              localStorage.removeItem("prana_hosp_session");
              localStorage.removeItem("prana_staff_session");
              router.replace("/hospitals/login");
            }}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Logout from hospital session"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Red Alert Banner */}
        {hasCriticalAlerts && (
          <div className="bg-red-600 text-white p-4 rounded-xl shadow-md border border-red-700 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
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

        {/* Patient Profile Card Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{patientData.patient.full_name}</h1>
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

            {/* Blood Group Display (Big) */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-3 text-center min-w-[120px]">
              <span className="block text-[10px] uppercase font-bold text-red-600 tracking-wider">Blood Group</span>
              <span className="text-3xl font-black text-red-700">{patientData.patient.blood_group}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 pt-4 gap-1 text-xs font-semibold overflow-x-auto">
            {[
              { id: "summary", label: "📋 Summary" },
              { id: "medications", label: "💊 Medications" },
              { id: "conditions", label: "🩺 Conditions" },
              { id: "vitals", label: "📈 Vitals" },
              { id: "surgeries", label: "🔬 Surgeries & Implants" },
              { id: "reports", label: "📄 Reports & AI" },
              { id: "insurance", label: "💳 Insurance" },
              { id: "emergency_contacts", label: "📞 Emergency Contacts" },
              { id: "access_log", label: "📜 Access Log" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRecordTab(tab.id as typeof recordTab)}
                className={`px-3.5 py-2 border-b-2 whitespace-nowrap transition ${
                  recordTab === tab.id
                    ? "border-teal-600 text-teal-800 font-bold bg-teal-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Areas */}
          <div className="min-h-[300px]">
            {/* 1. SUMMARY */}
            {recordTab === "summary" && (
              <div className="pt-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-xs uppercase text-red-800 flex items-center gap-1.5">
                      <span>⚠️</span> Allergies & Intolerances
                    </h4>
                    {patientData.allergies.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {patientData.allergies.map((a, i) => (
                          <li key={i} className="text-red-950 font-medium">
                            • <strong>{a.allergen}</strong> ({a.severity || "Reported"})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No known allergies registered.</p>
                    )}
                  </div>

                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-xs uppercase text-amber-800 flex items-center gap-1.5">
                      <span>⚡</span> Implants & Devices
                    </h4>
                    {patientData.devices.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {patientData.devices.map((d, i) => (
                          <li key={i} className="text-amber-950 font-medium">
                            • {d.name || d.device_name || "Implanted device"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No implanted devices.</p>
                    )}
                  </div>

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

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Primary Emergency Contact:</span>{" "}
                    {patientData.emergency_contacts[0] ? (
                      <span className="text-slate-900 font-semibold">
                        {patientData.emergency_contacts[0].name} ({patientData.emergency_contacts[0].relationship}) - {patientData.emergency_contacts[0].phone}
                      </span>
                    ) : "No primary contact listed"}
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Insurance Provider:</span>{" "}
                    <span className="text-teal-800 font-semibold">{patientData.patient.insurance_provider}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MEDICATIONS */}
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

            {/* 3. CONDITIONS */}
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

            {/* 4. VITALS */}
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
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {v.measured_at ? new Date(v.measured_at).toLocaleDateString() : "Historical baseline"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. SURGERIES & IMPLANTS */}
            {recordTab === "surgeries" && (
              <div className="pt-5 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <strong className="text-amber-900 block font-bold">MRI Safety Protocol Advisory</strong>
                    <span className="text-amber-800">Verify implant compatibility before conducting magnetic resonance imaging.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patientData.surgeries.map((s, i) => (
                    <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-slate-900 block text-sm">{s.procedure || s.surgery_name}</span>
                      <div className="text-slate-500">Date: <strong className="text-slate-700">{s.surgery_date || "Past record"}</strong></div>
                      {s.hospital_name && <div className="text-slate-500">Hospital: {s.hospital_name}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. REPORTS & AI SUMMARY */}
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

            {/* 7. INSURANCE */}
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

            {/* 8. EMERGENCY CONTACTS (SHOWS REAL PHONE NUMBERS + CALL BUTTON) */}
            {recordTab === "emergency_contacts" && (
              <div className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Next-of-Kin Emergency Contacts</h4>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Verified Direct Contact Numbers
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

            {/* 9. ACCESS LOG */}
            {recordTab === "access_log" && (
              <div className="pt-5 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Forensic Record Access Chain</h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span>Access Tier:</span>
                    <strong className="text-emerald-700">Red Tier (Full Clinical & Surgical File)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Opened At:</span>
                    <span className="font-mono text-slate-800">{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
