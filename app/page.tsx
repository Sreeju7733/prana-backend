import Link from "next/link";

export default function Home() {
  const apiCategories = [
    {
      title: "🔑 Authentication & OTP",
      endpoints: [
        { method: "POST", path: "/api/auth/send-otp", desc: "Send SMS OTP for authentication" },
        { method: "POST", path: "/api/auth/verify-otp", desc: "Verify OTP and issue session token" },
        { method: "POST", path: "/api/auth/resend-otp", desc: "Resend OTP with rate limit cooldown" },
      ]
    },
    {
      title: "🩺 Health & Patient Records",
      endpoints: [
        { method: "GET", path: "/api/dashboard", desc: "Unified dashboard hydration endpoint" },
        { method: "GET/POST", path: "/api/medications", desc: "Manage medications & dosage units" },
        { method: "GET/POST", path: "/api/allergies", desc: "Patient allergies & critical severities" },
        { method: "GET/POST", path: "/api/conditions", desc: "Medical conditions tracking" },
        { method: "GET/POST", path: "/api/vitals", desc: "Vitals records (BP, pulse, glucose)" },
        { method: "GET/POST", path: "/api/surgeries", desc: "Surgical history and notes" },
        { method: "GET/POST", path: "/api/devices", desc: "Medical implantable devices" },
        { method: "GET/POST", path: "/api/insurance", desc: "Insurance policies management" },
      ]
    },
    {
      title: "🚑 Emergency & Smart Card",
      endpoints: [
        { method: "GET", path: "/api/public/profiles/[user_id]/critical-allergies", desc: "Public emergency critical info lookup" },
        { method: "POST", path: "/api/card/suspend", desc: "Suspend emergency NFC/QR medical card" },
        { method: "POST", path: "/api/card/reactivate", desc: "Reactivate suspended emergency card" },
        { method: "GET", path: "/api/card/scan-history", desc: "Audit logs of physical card scans" },
        { method: "POST", path: "/api/emergency-contacts/test-sms", desc: "Test emergency SMS alerts" },
      ]
    },
    {
      title: "⚡ AI & Smart Checkers",
      endpoints: [
        { method: "POST", path: "/api/scanner/prescription", desc: "AI prescription OCR scanner & parser" },
        { method: "POST", path: "/api/checker/drug-interaction", desc: "Check harmful drug-to-drug interactions" },
        { method: "GET", path: "/api/health/summary", desc: "AI-generated medical case summary" },
        { method: "GET", path: "/api/health/supabase", desc: "Supabase DB connection health check" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-600 selection:text-white antialiased">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              🩺
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900">
                PRANA Medical Network
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-2 font-mono">v1.0.0</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              href="/hospitals"
              className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 px-3.5 py-1.5 rounded-lg transition"
            >
              🏥 Hospital EHR
            </Link>
            <Link
              href="/paramedic"
              className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 px-3.5 py-1.5 rounded-lg transition"
            >
              🚑 Paramedic App
            </Link>
            <Link
              href="/admin"
              className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-3.5 py-1.5 rounded-lg transition"
            >
              🛡️ Superadmin
            </Link>
            <Link
              href="/scan"
              className="text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hidden sm:block"
            >
              📷 QR Scanner
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              National Health Interoperability
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Hospital Clinical EHR & Universal Emergency Portal
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Standardized electronic medical records, emergency NFC/QR cards, and multi-tier access guards connecting verified hospitals, field paramedics, and patients.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/hospitals"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition text-center shadow-xs"
            >
              Launch Hospital EHR →
            </Link>
            <Link
              href="/admin"
              className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition text-center shadow-xs"
            >
              Superadmin Console →
            </Link>
          </div>
        </div>

        {/* API Categories Grid */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Platform Services & Microservices
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {apiCategories.map((category, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">{category.title}</h3>
                  <div className="space-y-2">
                    {category.endpoints.map((ep, eIdx) => (
                      <div key={eIdx} className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              ep.method === 'GET' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              ep.method === 'POST' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {ep.method}
                            </span>
                            <code className="font-mono text-slate-800">{ep.path}</code>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{ep.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16 py-6 text-center text-xs text-slate-500">
        PRANA Universal Emergency Medical Card Architecture • Certified HL7 & FHIR Interoperable
      </footer>
    </div>
  );
}
