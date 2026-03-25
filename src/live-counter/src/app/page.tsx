"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Terminal as TerminalIcon, Cpu, Zap, FileText, Video, CheckCircle } from "lucide-react";
import { CompanyModal, CompanyData } from "../components/CompanyModal";

// Mock event timeline that will simulate the pipeline and populate the table below
const DEMO_TIMELINE = [
  { t: 500,  log: "[system] Booting Phantom Pipeline Auto-SDR...", type: "system" },
  { t: 1500, log: "[scanner] Executing LinkedIn API scan (target: SDR Expansion)", type: "info" },
  { t: 2500, log: "✓ Found signal: Codefine International", type: "success", action: "ADD_COMPANY", company: { id: "codefine", name: "Codefine Int.", status: "detected", dm: "?", loss: "?", pdfReady: false, videoReady: false } },
  { t: 3000, log: "✓ Found signal: ECPI Edu", type: "success", action: "ADD_COMPANY", company: { id: "ecpi", name: "ECPI Edu", status: "detected", dm: "?", loss: "?", pdfReady: false, videoReady: false } },
  { t: 4000, log: "[profiler] Analyzing codefine.com context & tech stack...", type: "info", action: "UPDATE_COMPANY", id: "codefine", changes: { status: "profiling" } },
  { t: 5000, log: "⚡ [profiler] Extracting Decision Maker via Hunter.io fallback", type: "warning" },
  { t: 6000, log: "🔥 ✓ Found DM: Marilene Simplicio <rmartinez@codefine.com>", type: "success", action: "UPDATE_COMPANY", id: "codefine", changes: { dm: "Marilene S." } },
  { t: 6500, log: "[profiler] Calculated Monthly Loss Estimate: $1,903/month", type: "error", action: "UPDATE_COMPANY", id: "codefine", changes: { loss: "$1,903", status: "profiled" } },
  { t: 7500, log: "⚡ [content] PERSON 2: Generating 'Pipeline Autopsy' PDF Report (Codefine)", type: "warning", action: "UPDATE_COMPANY", id: "codefine", changes: { status: "generating_pdf" } },
  { t: 9000, log: "✓ PDF Generated", type: "success", action: "UPDATE_COMPANY", id: "codefine", changes: { pdfReady: true, status: "generating_video" } },
  { t: 10000, log: "⚡ [content] PERSON 2: Generating Sora AI Video Pitch (Codefine)", type: "warning" },
  { t: 12500, log: "✓ Video Generated", type: "success", action: "UPDATE_COMPANY", id: "codefine", changes: { videoReady: true, status: "sending" } },
  { t: 13500, log: "[bridge] Initiating deep validation & DNC check...", type: "info" },
  { t: 14000, log: "[bridge] Uploading enriched contact to Salesforge Multichannel Sequence...", type: "info" },
  { t: 15000, log: "🔥 ✓ Upload successful! Sequence started for Codefine", type: "success", action: "UPDATE_COMPANY", id: "codefine", changes: { status: "live" } },
  
  // Meanwhile processing the next one
  { t: 15500, log: "[profiler] Analyzing ecpi.edu context...", type: "info", action: "UPDATE_COMPANY", id: "ecpi", changes: { status: "profiling" } },
  { t: 16500, log: "🔥 ✓ Found DM: John Doe <jdoe@ecpi.edu>", type: "success", action: "UPDATE_COMPANY", id: "ecpi", changes: { dm: "John Doe", loss: "$2,450", status: "profiled" } },
  { t: 17500, log: "⚡ [content] Generating PDF...", type: "warning", action: "UPDATE_COMPANY", id: "ecpi", changes: { status: "generating_pdf" } },
  { t: 19000, log: "✓ PDF Generated", type: "success", action: "UPDATE_COMPANY", id: "ecpi", changes: { pdfReady: true, status: "pending_video" } },
  { t: 20000, log: "[system] CLI demonstration paused. Waiting for further instructions...", type: "system" }
];

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleLaunch = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([{ text: "Initializing boot sequence...", type: "system" }]);
    setCompanies([]);
    
    // Trigger backend
    fetch("/api/launch", { method: "POST" }).catch(console.error);

    // Play the visually rich timeline
    DEMO_TIMELINE.forEach((event) => {
      setTimeout(() => {
        setLogs(prev => [...prev, { text: event.log, type: event.type }]);
        
        if (event.action === "ADD_COMPANY") {
          setCompanies(prev => [...prev, event.company]);
        } else if (event.action === "UPDATE_COMPANY") {
          setCompanies(prev => prev.map(c => 
            // @ts-ignore
            c.id === event.id ? { ...c, ...event.changes } as CompanyData : c
          ));
        }

        if (event === DEMO_TIMELINE[DEMO_TIMELINE.length - 1]) {
          setIsRunning(false);
        }
      }, event.t);
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'detected': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600">Detected</span>;
      case 'profiling': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-700 animate-pulse">Profiling...</span>;
      case 'profiled': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-purple-100 text-purple-700">Profiled</span>;
      case 'generating_pdf': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-blue-100 text-blue-700 animate-pulse">Generating PDF</span>;
      case 'generating_video': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700 animate-pulse">Sora AI Video</span>;
      case 'sending': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-700 animate-pulse">Sending to SF</span>;
      case 'live': return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3 inline mr-1"/>Live in Seq</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-200 relative overflow-hidden flex flex-col items-center pb-24">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.06)_0%,rgba(248,250,252,1)_50%)] pointer-events-none -z-10" />
      
      {/* Top Navbar */}
      <nav className="w-full max-w-7xl px-8 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Cpu className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Phantom <span className="text-purple-600">Pipeline</span></span>
        </div>
        <div className="flex gap-4">
          <span className="text-sm font-medium text-slate-500 px-3 py-1 bg-white rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        
        {/* Left Column: Actions & Copy */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col justify-center gap-6 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100/50 text-purple-700 font-semibold text-sm w-max border border-purple-200/50 backdrop-blur-sm">
            <Zap className="w-4 h-4 fill-purple-600" />
            INTERNAL DASHBOARD
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
            Monitor the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">sales pipeline.</span>
          </h1>
          
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
            Watch Phantom Pipeline autonomously find signals, generate hyper-personalized PDfs and Sora AI videos, and enroll contacts directly into Salesforge sequences.
          </p>

          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={handleLaunch}
              disabled={isRunning}
              className={`group relative flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white transition-all duration-300 shadow-xl border border-transparent ${
                isRunning 
                  ? "bg-slate-800 cursor-not-allowed shadow-none scale-95" 
                  : "bg-slate-900 hover:bg-black hover:scale-105"
              }`}
            >
              {isRunning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  CLI Demo Running...
                </>
              ) : (
                <>
                  <TerminalIcon className="w-5 h-5 text-purple-400" />
                  Activate CLI demonstration
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Terminal overlay representation */}
        <div className="lg:col-span-12 xl:col-span-5 w-full mt-8 xl:mt-0 relative top-[-40px]">
          <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800/50 backdrop-blur-xl">
            <div className="px-4 py-3 bg-slate-950/50 flex items-center justify-between border-b border-slate-800">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" /> phantom-cli
              </div>
            </div>
            <div ref={terminalContainerRef} className="p-5 h-[320px] overflow-y-auto font-mono text-sm leading-relaxed space-y-2 text-slate-300 scrollbar-thin scrollbar-thumb-slate-700">
              {logs.length === 0 ? (
                <div className="text-slate-600 flex items-center h-full justify-center opacity-50 text-center">
                  Target environment ready.<br/>Run "Activate CLI demonstration" to start.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'error' ? 'text-rose-400' :
                      log.type === 'warning' ? 'text-amber-400' :
                      log.type === 'system' ? 'text-purple-400' :
                      'text-slate-300'
                    }`}
                  >
                    {log.text}
                  </div>
                ))
              )}
              {isRunning && (
                <div className="flex items-center gap-2 text-slate-500 mt-4">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-slate-300 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Analytics Dashboard Grid beneath the Hero */}
      <section className="w-full max-w-7xl px-8 mt-16 z-10 transition-all duration-700">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analyzed Companies</h2>
            <p className="text-sm text-slate-500">Real-time pipeline extraction and content generation feed.</p>
          </div>
          <div className="text-sm font-semibold px-3 py-1 bg-slate-200/50 rounded-lg text-slate-600">
            Total Extracted: {companies.length}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Decision Maker</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Monthly Loss</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Content</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No companies isolated yet. Launch the Auto-SDR tool.
                    </td>
                  </tr>
                )}
                {companies.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCompany(c)}
                    className="hover:bg-purple-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.id}.com</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                      {c.dm}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded w-max">
                        {c.loss}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button disabled={!c.pdfReady} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${c.pdfReady ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                          <FileText className="w-3.5 h-3.5" /> Autopsy PDF
                        </button>
                        <button disabled={!c.videoReady} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${c.videoReady ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                          <Video className="w-3.5 h-3.5" /> Sora Pitch
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CompanyModal 
        isOpen={!!selectedCompany} 
        onClose={() => setSelectedCompany(null)} 
        company={selectedCompany} 
      />
    </div>
  );
}
