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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Prana Backend API
            </span>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">v1.0.0</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/hospital"
              className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>🚑</span> Hospital Paramedic
            </Link>
            <Link
              href="/admin"
              className="bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-purple-300 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>🛡️</span> Superadmin
            </Link>
            <Link
              href="/scan"
              className="text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
            >
              <span>📷</span> Scanner
            </Link>
            <a
              href="/api/health/supabase"
              target="_blank"
              className="text-zinc-400 hover:text-emerald-400 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              DB Status
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-zinc-800/80 pb-10">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
              Emergency Health & <span className="text-emerald-400">Prana Card</span> API
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl">
              High-performance Next.js backend powering secure medical records, emergency NFC/QR smart cards, AI prescription scanners, and instant life-saving briefings.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 min-w-[260px] shadow-xl">
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">Server Status</div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              Operational & Ready
            </div>
            <div className="text-xs text-zinc-500 font-mono">Environment: Development</div>
          </div>
        </div>

        {/* API Categories Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6 text-zinc-200 flex items-center gap-2">
            <span>⚡</span> Available Endpoint Modules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apiCategories.map((category, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">{category.title}</h3>
                  <div className="space-y-3">
                    {category.endpoints.map((ep, eIdx) => (
                      <div key={eIdx} className="group flex items-start justify-between gap-4 py-2 border-b border-zinc-800/50 last:border-0">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              ep.method === 'GET' ? 'bg-blue-950 text-blue-400 border border-blue-800/50' :
                              ep.method === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                              'bg-amber-950 text-amber-400 border border-amber-800/50'
                            }`}>
                              {ep.method}
                            </span>
                            <code className="text-sm font-mono text-zinc-200 group-hover:text-white">{ep.path}</code>
                          </div>
                          <p className="text-xs text-zinc-400">{ep.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Test Links & Footer */}
        <div className="mt-12 p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <div>
            Want to test an endpoint right now? Try checking the Supabase connection health.
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/health/supabase"
              target="_blank"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              GET /api/health/supabase
            </a>
            <a
              href="/api/dashboard"
              target="_blank"
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              GET /api/dashboard
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-20 py-8 text-center text-xs text-zinc-600">
        Prana Emergency Backend &bull; Secure Medical Intelligence Platform
      </footer>
    </div>
  );
}
