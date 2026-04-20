/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Cpu, Zap, FileText, Video, CheckCircle, RefreshCw } from "lucide-react";
import { CompanyModal, CompanyData } from "../components/CompanyModal";

interface LogEntry {
  text: string;
  type: string;
}

function getLogType(log: string): string {
  if (log.startsWith('✓') || log.includes('[system]')) return 'success';
  if (log.startsWith('[error]') || log.toLowerCase().includes('error')) return 'error';
  if (log.startsWith('[profiler]') || log.startsWith('[content]') || log.startsWith('[video]') || log.startsWith('[pdf]') || log.startsWith('[bridge]') || log.startsWith('[delivery]')) return 'warning';
  return 'info';
}

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchCompanies = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.companies) setCompanies(data.companies);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleDemoRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([{ text: '[system] Starting Phantom Pipeline...', type: 'system' }]);

    try {
      const res = await fetch('/api/demo-run', { method: 'POST' });
      const data = await res.json();

      if (Array.isArray(data.logs)) {
        for (const line of data.logs as string[]) {
          await new Promise<void>(r => setTimeout(r, 40));
          setLogs(prev => [...prev, { text: line, type: getLogType(line) }]);
        }
      }

      if (data.success) {
        setLogs(prev => [...prev, { text: '[system] Pipeline complete. Refreshing companies...', type: 'success' }]);
        await fetchCompanies();
      } else if (data.error) {
        setLogs(prev => [...prev, { text: `[error] ${data.error}`, type: 'error' }]);
      }
    } catch (err) {
      setLogs(prev => [...prev, { text: '[error] Failed to run pipeline: ' + String(err), type: 'error' }]);
    }

    setIsRunning(false);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'detected':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600">Detected</span>;
      case 'profiled':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-purple-100 text-purple-700">Profiled</span>;
      case 'content_generated':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-blue-100 text-blue-700">Content Ready</span>;
      case 'outreach_sent':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700">In Sequence</span>;
      case 'responded':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-700">Responded</span>;
      case 'pilot_running':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-700 animate-pulse">Pilot Running</span>;
      case 'pilot_results_ready':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-sky-100 text-sky-700">Results Ready</span>;
      case 'demo_booked':
        return <span className="px-2 py-1 text-xs font-bold rounded-md bg-green-100 text-green-800 border border-green-200"><CheckCircle className="w-3 h-3 inline mr-1" />Demo Booked!</span>;
      case 'dnc_blocked':
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-600">DNC</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600">{status}</span>;
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
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500 px-3 py-1 bg-white rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { initials: "VN", href: "https://www.linkedin.com/in/vladyslav-nidzelskyi-38217a3b9/" },
              { initials: "BA", href: "https://www.linkedin.com/in/boris-arutinov-16471233a" },
              { initials: "OB", href: "https://www.linkedin.com/in/oleksii-burianov-096648397/" },
              { initials: "KP", href: "https://www.linkedin.com/in/kirill-pochinchik-6ba461330/" },
              { initials: "IK", href: "https://www.linkedin.com/in/ivan-kliuss" },
            ].map((m) => (
              <a
                key={m.initials}
                href={m.href}
                target="_blank"
                rel="noopener noreferrer"
                title={m.initials}
                className="w-7 h-7 rounded-full bg-purple-100 border border-purple-200 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-all flex items-center justify-center text-[10px] font-bold text-purple-700"
              >
                {m.initials}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">

        {/* Left Column */}
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
            Watch Phantom Pipeline autonomously find signals, generate hyper-personalized PDFs and Shotstack videos, and enroll contacts directly into Salesforge sequences.
          </p>

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handleDemoRun}
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
                  Pipeline Running...
                </>
              ) : (
                <>
                  <TerminalIcon className="w-5 h-5 text-purple-400" />
                  Run Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Terminal */}
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
            <div ref={terminalContainerRef} className="p-5 h-[320px] overflow-y-auto font-mono text-sm leading-relaxed space-y-2 text-slate-300">
              {logs.length === 0 ? (
                <div className="text-slate-600 flex items-center h-full justify-center opacity-50 text-center">
                  Target environment ready.<br />Click "Run Pipeline" to start.
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

      {/* Companies Table */}
      <section className="w-full max-w-7xl px-8 mt-16 z-10">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analyzed Companies</h2>
            <p className="text-sm text-slate-500">Live data from Supabase — real pipeline feed.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCompanies}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="text-sm font-semibold px-3 py-1 bg-slate-200/50 rounded-lg text-slate-600">
              Total: {companies.length}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 mb-3 py-2.5 px-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Demo notice:</span> This is a prototype. Video generation runs on Shotstack free tier — due to limited render quota, videos may not generate alongside every PDF. PDFs are always produced.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Decision Maker</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"><div>Est. Monthly Loss</div><div className="text-slate-400 normal-case font-normal tracking-normal mt-0.5" style={{fontSize:"10px"}}>SDRs × 8h × $28.85/h × 22 days</div></th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Content</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {isRefreshing ? 'Loading from Supabase...' : 'No companies in pipeline yet. Run the pipeline to start.'}
                    </td>
                  </tr>
                )}
                {companies.map((c) => {
                  const dmLabel = c.decision_maker?.name ?? c.decision_maker?.email ?? '—';
                  const lossLabel = c.monthly_loss_estimate ? '$' + c.monthly_loss_estimate.toLocaleString() : '—';
                  const hasPdf = Boolean(c.report?.pdf_url);
                  const hasVideo = Boolean(c.report?.video_url);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompany(c)}
                      className="hover:bg-purple-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.domain}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">{dmLabel}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded w-max">{lossLabel}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${hasPdf ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </span>
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${hasVideo ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Video className="w-3.5 h-3.5" /> Shotstack
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  );
                })}
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