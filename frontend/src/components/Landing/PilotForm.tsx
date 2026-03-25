"use client"

import { ArrowRight, Zap } from "lucide-react"

const DASHBOARD_URL = (import.meta as any).env?.VITE_DASHBOARD_URL ?? "http://localhost:3000"

const METRICS = [
  {
    label: "Time per lead",
    manual: "3 hrs",
    phantom: "20 sec",
    gain: "720×",
    gainLabel: "faster",
  },
  {
    label: "Emails per day",
    manual: "12",
    phantom: "500+",
    gain: "+4,000%",
    gainLabel: "more reach",
  },
  {
    label: "Contacted Leads per month",
    manual: "240",
    phantom: "15,000+",
    gain: "62×",
    gainLabel: "more leads",
  },
  {
    label: "Cost per lead",
    manual: "$400",
    phantom: "$5",
    gain: "−97%",
    gainLabel: "cheaper",
    green: true,
  },
]

export default function PilotForm() {

  return (
    <section className="py-28 bg-white relative border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-10 items-center">

          {/* ── LEFT: Launch Auto SDR ── */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0f0720] via-[#1a0d35] to-[#0d0d1a] border border-[#783FDD]/20 shadow-2xl flex flex-col justify-between p-10 min-h-[480px]">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(#783FDD 1px, transparent 1px), linear-gradient(90deg, #783FDD 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#783FDD]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-[#783FDD]/10 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-[#783FDD]/15 border border-[#783FDD]/30 rounded-full px-4 py-1.5 mb-8">
                <Zap className="w-3.5 h-3.5 text-[#783FDD]" />
                <span className="text-[#783FDD] text-xs font-bold uppercase tracking-widest">Autonomous AI SDR</span>
              </div>
              <h3 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4">
                Your pipeline,<br />
                on autopilot.<br />
                <span className="text-[#783FDD]">Get 1000+ demos within this system.</span>
              </h3>
            </div>

            <div className="relative z-10 mt-10">
              <button
                onClick={() => { window.location.href = DASHBOARD_URL }}
                className="w-full flex items-center justify-center gap-2.5 bg-[#783FDD] hover:bg-[#8f55e8] text-white font-bold py-4 px-6 rounded-xl transition-all text-base shadow-[0_8px_40px_rgba(120,63,221,0.45)] hover:shadow-[0_12px_50px_rgba(120,63,221,0.6)] hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Zap className="w-5 h-5 fill-white" />
                Launch Auto SDR
              </button>
            </div>
          </div>

          {/* ── RIGHT: Comparison ── */}
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-2xl font-extrabold text-gray-900 leading-snug mb-1">
                vs manual outreach
              </h3>
              <p className="text-gray-900/50 text-sm font-medium">Same task. Same goal. Wildly different numbers.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {METRICS.map(({ label, manual, phantom, gain, gainLabel, green }) => (
                <div
                  key={label}
                  className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col"
                >
                  {/* Label */}
                  <div className="px-4 pt-4 pb-2">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">{label}</span>
                  </div>

                  {/* Split: SDR | AI */}
                  <div className="flex flex-1">
                    {/* SDR side */}
                    <div className="flex-1 bg-gray-100 px-4 py-3 flex flex-col items-center justify-center border-r border-gray-200">
                      <span className="text-[10px] text-gray-900/50 font-bold uppercase tracking-widest mb-1">SDR</span>
                      <span className="text-xl font-bold text-gray-900 leading-none">{manual}</span>
                    </div>

                    {/* AI side */}
                    <div className="flex-1 bg-[#783FDD]/8 px-4 py-3 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-[#783FDD] font-bold uppercase tracking-widest mb-1">Phantom</span>
                      <span className="text-xl font-black text-[#783FDD] leading-none">{phantom}</span>
                    </div>
                  </div>

                  {/* Gain */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-center gap-1 text-xs font-bold ${
                      green
                        ? "bg-green-50 text-green-700"
                        : "bg-[#783FDD]/10 text-[#783FDD]"
                    }`}
                  >
                    {gain}
                    <span className="font-semibold opacity-60">{gainLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { window.location.href = DASHBOARD_URL }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900/40 hover:text-[#783FDD] transition-colors group"
            >
              See full system in action
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
