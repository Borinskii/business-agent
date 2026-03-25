import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, Banknote, Mailbox, Activity } from 'lucide-react';

export interface CompanyData {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  sdr_count?: number;
  monthly_loss_estimate?: number;
  decision_maker?: { name?: string; email?: string; title?: string } | null;
  status: string;
  pain_score?: number;
  report?: {
    pdf_url?: string | null;
    video_url?: string | null;
    status?: string;
    personal_page_slug?: string;
  } | null;
  sequence?: {
    salesforge_sequence_id?: string;
    status?: string;
  } | null;
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

  const monthlyLossDisplay = company?.monthly_loss_estimate
    ? '$' + company.monthly_loss_estimate.toLocaleString() + '/mo'
    : '—';

  const dmDisplay =
    company?.decision_maker?.name ??
    company?.decision_maker?.email ??
    '—';

  return (
    <AnimatePresence>
      {isOpen && company && (
        <React.Fragment key="modal-fragment">
          {/* Glassmorphism Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
          />

          {/* MacOS Styled Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 m-auto z-[101] w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/60"
          >
            {/* MacOS Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200/60 backdrop-blur-sm">
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#E0443E] transition-colors shadow-sm"
                />
                <button className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#DEA123] transition-colors shadow-sm" />
                <button className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#1AAB29] transition-colors shadow-sm" />
              </div>
              <div className="font-semibold text-xs text-slate-500 tracking-wide uppercase">
                Phantom Autopsy — {company.name}
              </div>
              <div className="w-12"></div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex flex-col lg:flex-row bg-white overflow-hidden">

              {/* Left Column: PDF Viewer */}
              <div className="w-full lg:w-1/2 h-full border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold bg-white">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Pipeline Autopsy Report (PDF)
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  {company.report?.pdf_url ? (
                    <iframe
                      src={company.report.pdf_url}
                      className="w-full h-full rounded-xl"
                    />
                  ) : company.report?.status === 'failed' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-10 h-10 mb-3 text-rose-300" />
                      <span className="text-rose-500 font-semibold">PDF generation failed</span>
                      <span className="text-xs text-slate-400 mt-1">Check the pipeline logs for details.</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-4" />
                      Generating highly personalized PDF...
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Video & Stats */}
              <div className="w-full lg:w-1/2 h-full flex flex-col bg-white overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold">
                  <Video className="w-5 h-5 text-purple-500" />
                  Sora AI Pitch Video
                </div>
                <div className="p-8 pb-0">
                  {company.report?.video_url ? (
                    <video
                      src={company.report.video_url}
                      controls
                      className="w-full rounded-xl"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Video className="w-8 h-8 mb-2 opacity-50 animate-pulse" />
                      Rendering AI Video...
                    </div>
                  )}
                </div>

                <div className="p-8 grid grid-cols-2 gap-4">
                  <div className="col-span-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Extraction Stats</div>

                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold">
                      <Banknote className="w-4 h-4" /> Est. Monthly Loss
                    </div>
                    <div className="text-2xl font-black text-rose-700">{monthlyLossDisplay}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                      <Mailbox className="w-4 h-4" /> Target DM
                    </div>
                    <div className="text-lg font-bold text-slate-800 truncate">{dmDisplay}</div>
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
