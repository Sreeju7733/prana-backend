"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HospitalItem {
  id: string;
  hospital_id: string;
  name: string;
  registration_number: string;
  city?: string;
  state?: string;
  default_pass?: string;
}

export default function HospitalLoginPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Hospital Clinical Login Gateway • PRANA EHR";
  }, []);

  const [hospitalsList, setHospitalsList] = useState<HospitalItem[]>([
    {
      id: "4deb47bf-74ce-40d0-a36d-0fa174f4a1f5",
      hospital_id: "HOSP-AIIMS-01",
      name: "AIIMS New Delhi - Trauma & Emergency Center",
      registration_number: "REG-AIIMS-2024-001",
      city: "New Delhi",
      state: "Delhi",
      default_pass: "aiims@123",
    },
    {
      id: "155dc910-9cdb-499d-9afe-7a7cc6adf29b",
      hospital_id: "HOSP-MAX-02",
      name: "Max Super Speciality Hospital Saket",
      registration_number: "REG-MAX-2023-042",
      city: "New Delhi",
      state: "Delhi",
      default_pass: "max@123",
    },
    {
      id: "4b08c84c-349d-48f2-8a5f-7ff27ed141b6",
      hospital_id: "HOSP-APOLLO-03",
      name: "Indraprastha Apollo Hospitals",
      registration_number: "REG-APOLLO-2022-819",
      city: "New Delhi",
      state: "Delhi",
      default_pass: "apollo@123",
    },
    {
      id: "2fadccb6-172f-4345-a2ae-8a0d5a1f0878",
      hospital_id: "HOSP-FORTIS-04",
      name: "Fortis Memorial Research Institute",
      registration_number: "REG-FORTIS-2023-110",
      city: "Gurugram",
      state: "Haryana",
      default_pass: "fortis@123",
    },
  ]);

  const [selectedHospital, setSelectedHospital] = useState<HospitalItem>(hospitalsList[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [password, setPassword] = useState("aiims@123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch registered hospitals from API if available
  useEffect(() => {
    async function loadHospitals() {
      try {
        const res = await fetch("/api/hospitals");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const passMap: Record<string, string> = {
            "HOSP-AIIMS-01": "aiims@123",
            "HOSP-MAX-02": "max@123",
            "HOSP-APOLLO-03": "apollo@123",
            "HOSP-FORTIS-04": "fortis@123",
          };
          const mapped = json.data.map((h: HospitalItem) => ({
            ...h,
            default_pass: passMap[h.hospital_id] || "1234",
          }));
          setHospitalsList(mapped);
          setSelectedHospital(mapped[0]);
          setPassword(mapped[0].default_pass || "1234");
        }
      } catch {
        // Fall back to default static list
      }
    }
    loadHospitals();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter hospitals based on search input
  const filteredHospitals = hospitalsList.filter((h) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      h.name.toLowerCase().includes(term) ||
      h.hospital_id.toLowerCase().includes(term) ||
      h.registration_number.toLowerCase().includes(term) ||
      (h.city && h.city.toLowerCase().includes(term))
    );
  });

  const handleSelectHospital = (h: HospitalItem) => {
    setSelectedHospital(h);
    setIsDropdownOpen(false);
    setSearchTerm("");
    // Automatically fill in password for this hospital
    setPassword(h.default_pass || "1234");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hospital-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: selectedHospital.hospital_id.trim(),
          password: password.trim(),
          pin: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      // Save credentials in session storage / local storage
      localStorage.setItem("prana_hosp_session", JSON.stringify(data.hospital));
      localStorage.setItem("prana_staff_session", JSON.stringify(data.staff));
      localStorage.setItem("prana_hosp_token", data.token);

      // Redirect directly to the Hospital EHR Workstation
      router.push("/hospitals");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hospital login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-teal-600 selection:text-white antialiased">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
            🏥
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              PRANA Hospital Network
            </span>
            <span className="text-[10px] bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded ml-2 font-mono font-bold uppercase">
              Clinical Access Gateway
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">
            🛡️ Superadmin
          </Link>
          <Link href="/paramedic" className="text-slate-600 hover:text-slate-900">
            🚑 Paramedic App
          </Link>
          <Link href="/scan" className="text-slate-600 hover:text-slate-900">
            📷 QR Scanner
          </Link>
        </div>
      </header>

      {/* Main Login Form Container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl mx-auto shadow-xs">
              🩺
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Clinical Login</h1>
            <p className="text-xs text-slate-500">
              Sign in with your hospital ID and facility password.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Searchable Hospital Selector */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Select Accredited Hospital Facility
                </label>
                <span className="text-[10px] text-teal-700 font-mono">
                  {filteredHospitals.length} facilities
                </span>
              </div>

              {/* Quick Search Input */}
              <div className="relative mb-2">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search hospital by name, ID (e.g. HOSP-AIIMS), or city..."
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Selected Hospital Display Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border border-slate-300 hover:border-teal-600 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-lg px-3.5 py-2.5 text-left flex items-center justify-between transition shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-slate-900 truncate text-xs">
                    {selectedHospital.name}
                  </div>
                  <div className="text-[11px] font-mono text-teal-700">
                    {selectedHospital.hospital_id} • {selectedHospital.city || "Delhi"}
                  </div>
                </div>
                <span className="text-slate-400 text-xs shrink-0">{isDropdownOpen ? "▲" : "▼"}</span>
              </button>

              {/* Searchable Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                  {/* Filtered Hospitals List */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredHospitals.length > 0 ? (
                      filteredHospitals.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => handleSelectHospital(h)}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-teal-50 transition flex items-start justify-between gap-2 ${
                            selectedHospital.hospital_id === h.hospital_id ? "bg-teal-50/70 border-l-4 border-teal-600" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {h.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              <span className="text-teal-700 font-bold">{h.hospital_id}</span> • {h.city || "Delhi"}
                            </div>
                          </div>
                          {selectedHospital.hospital_id === h.hospital_id && (
                            <span className="text-teal-700 font-bold text-xs shrink-0">✓</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No hospital matches &quot;{searchTerm}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hospital Password / PIN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Hospital Access Password / PIN
                </label>
                {selectedHospital.default_pass && (
                  <button
                    type="button"
                    onClick={() => setPassword(selectedHospital.default_pass || "")}
                    className="text-[11px] text-teal-700 hover:text-teal-800 font-mono font-bold hover:underline"
                    title="Fill default password for this facility"
                  >
                    Pass: {selectedHospital.default_pass}
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Enter password for ${selectedHospital.hospital_id}`}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 outline-none focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-xs disabled:opacity-50 mt-2"
            >
              {isLoading ? "Authenticating Facility..." : `Sign In to ${selectedHospital.hospital_id}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
