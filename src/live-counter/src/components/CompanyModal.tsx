import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, Banknote, Mailbox, Activity } from 'lucide-react';

export interface CompanyData {
  id: string;
  name: string;
  dm: string;
  loss: string;
  status: string;
  pdfReady?: boolean;
  videoReady?: boolean;
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
              
              {/* Left Column: PDF Viewer Mock */}
              <div className="w-full lg:w-1/2 h-full border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold bg-white">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Pipeline Autopsy Report (PDF)
                </div>
                <div className="flex-1 p-8 overflow-y-auto">
                  {company.pdfReady ? (
                    <div className="w-full bg-white shadow-lg rounded-xl min-h-[600px] border border-slate-200 p-8 flex flex-col items-center">
                      <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-12 h-12 text-indigo-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{company.name}</h2>
                      <p className="text-slate-500 mb-8 text-center max-w-sm">Detailed breakdown of pipeline inefficiencies and automation opportunities.</p>
                      
                      <div className="w-full space-y-4">
                        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                        <div className="h-4 bg-slate-100 rounded-full w-5/6"></div>
                        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                        <div className="h-4 bg-slate-100 rounded-full w-4/6"></div>
                      </div>
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
                  {company.videoReady ? (
                    <div className="w-full aspect-video bg-slate-900 rounded-xl relative overflow-hidden group shadow-lg cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <div className="w-0 h-0 border-l-[16px] border-l-white border-y-[10px] border-y-transparent ml-2" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4 text-white font-medium">Pitch_to_{company.dm.split(' ')[0]}_Final.mp4</div>
                    </div>
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
                    <div className="text-2xl font-black text-rose-700">{company.loss}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                      <Mailbox className="w-4 h-4" /> Target DM
                    </div>
                    <div className="text-lg font-bold text-slate-800 truncate">{company.dm}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 col-span-2">
                    <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                      <Activity className="w-4 h-4" /> Pipeline Status
                    </div>
                    <div className="text-lg font-bold text-slate-800 capitalize">{company.status.replace('_', ' ')}</div>
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
