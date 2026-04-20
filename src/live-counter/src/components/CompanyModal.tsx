/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, Banknote, Mailbox, Activity, ExternalLink } from 'lucide-react';

export interface CompanyData {
  id: string;
  name: string;
  domain: string;
  status: string;
  monthly_loss_estimate: number | null;
  decision_maker: { name?: string; email?: string; title?: string } | null;
  report: { pdf_url?: string; video_url?: string; status?: string; personal_page_slug?: string } | null;
  sequence: { salesforge_sequence_id?: string; status?: string } | null;
  pain_score?: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyData | null;
}

export function CompanyModal({ isOpen, onClose, company }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && company && (
        <React.Fragment key="modal-fragment">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 m-auto z-[101] w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/60"
          >
            {/* MacOS Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200/60 backdrop-blur-sm">
              <div className="flex gap-2">
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#E0443E] transition-colors shadow-sm" />
                <button className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#DEA123] transition-colors shadow-sm" />
                <button className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#1AAB29] transition-colors shadow-sm" />
              </div>
              <div className="font-semibold text-xs text-slate-500 tracking-wide uppercase">
                Phantom Autopsy — {company.name}
              </div>
              <div className="w-12" />
            </div>

            <div className="flex-1 flex flex-col lg:flex-row bg-white overflow-hidden">

              {/* Left: PDF */}
              <div className="w-full lg:w-1/2 h-full border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold bg-white">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Pipeline Autopsy Report (PDF)
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  {company.report?.pdf_url ? (
                    <>
                      <div className="flex items-center justify-end px-4 py-1 border-b border-slate-100 bg-white">
                        <a
                          href={company.report.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Open in new tab
                        </a>
                      </div>
                      <iframe
                        src={company.report.pdf_url}
                        className="flex-1 w-full"
                        title="Pipeline Autopsy PDF"
                      />
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-4" />
                      <span className="text-sm">Generating PDF report...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Video + Stats */}
              <div className="w-full lg:w-1/2 h-full flex flex-col bg-white overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold">
                  <Video className="w-5 h-5 text-purple-500" />
                  Shotstack Video Pitch
                </div>
                <div className="p-8 pb-0">
                  {company.report?.video_url ? (
                    <div className="w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                      <video
                        src={company.report.video_url}
                        controls
                        autoPlay={false}
                        playsInline
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const el = e.currentTarget;
                          const parent = el.parentElement;
                          if (parent) {
                            parent.innerHTML = `<a href="${company.report!.video_url}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center justify-center h-full gap-3 text-slate-300 hover:text-white transition-colors"><svg xmlns='http://www.w3.org/2000/svg' class='w-12 h-12 opacity-60' viewBox='0 0 24 24' fill='currentColor'><path d='M8 5v14l11-7z'/></svg><span class='text-sm font-semibold'>Open Video</span></a>`;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Video className="w-8 h-8 mb-2 opacity-50 animate-pulse" />
                      <span className="text-sm">Rendering Shotstack video...</span>
                    </div>
                  )}
                </div>

                <div className="p-8 grid grid-cols-2 gap-4">
                  <div className="col-span-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Extraction Stats</div>

                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold">
                      <Banknote className="w-4 h-4" /> Est. Monthly Loss
                    </div>
                    <div className="text-2xl font-black text-rose-700">
                      {company.monthly_loss_estimate ? `$${company.monthly_loss_estimate.toLocaleString()}` : '—'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                      <Mailbox className="w-4 h-4" /> Target DM
                    </div>
                    <div className="text-base font-bold text-slate-800 truncate">
                      {company.decision_maker?.name ?? company.decision_maker?.email ?? '—'}
                    </div>
                    {company.decision_maker?.title && (
                      <div className="text-xs text-slate-500 truncate">{company.decision_maker.title}</div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 col-span-2">
                    <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                      <Activity className="w-4 h-4" /> Pipeline Status
                    </div>
                    <div className="text-lg font-bold text-slate-800 capitalize">{company.status.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}