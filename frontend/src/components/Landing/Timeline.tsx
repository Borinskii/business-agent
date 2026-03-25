/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import React, { useEffect, useRef, useState } from "react";
import { Radar, UserPlus, Zap, Rocket, CalendarCheck } from "lucide-react";
import AnoAI from "../ui/animated-shader-background";

const steps = [
  {
    title: "We Detect Pain Signals",
    desc: "Monitoring LinkedIn, Crunchbase, and G2 in real-time. When a company hires SDRs or churns a competitor — we find them.",
    icon: Radar,
  },
  {
    title: "We Profile the Company",
    desc: "Leadsforge + Crunchbase + LinkedIn give us everything: team size, ICP, decision maker, and exact pipeline lost per month.",
    icon: UserPlus,
  },
  {
    title: "We Generate Outreach",
    desc: "Claude AI + Puppeteer create a hyper-personalized PDF report with their logo, numbers, and competitor data. Zero human touch.",
    icon: Zap,
  },
  {
    title: "We Execute Campaigns",
    desc: "Email + LinkedIn + Slack via Salesforge API. PDF attached, video embedded, and a personalized live counter ticking.",
    icon: Rocket,
  },
  {
    title: "They Book a 1-on-1 With You",
    desc: "The prospect has seen their numbers, watched their video, read their report — and they request a private interview. You show up to close.",
    icon: CalendarCheck,
    isFinal: true,
  }
];

function TimelineStep({ step, idx }: { step: any; idx: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false); // replay on scroll up
        }
      },
      {
        threshold: 0.3,
        rootMargin: "0px 0px -100px 0px"
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);

  const isEven = idx % 2 === 0;

  return (
    <div
      ref={ref}
      className={`relative flex flex-col md:flex-row w-full items-start md:items-center gap-6 md:gap-12 group/step ${
        isEven ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Content Side */}
      <div className={`flex-1 w-full pl-16 md:pl-0 flex ${isEven ? "md:justify-start" : "md:justify-end"}`}>
        <div
          className={`w-full max-w-lg transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isVisible ? "opacity-100 translate-y-0 scale-100 blur-0" : "opacity-0 translate-y-16 scale-[0.96] blur-sm"}`}
          style={{ transitionDelay: '50ms' }}
        >
          {/* High-end Glassmorphism Card */}
          <div className="relative bg-[#0d0d0d]/60 dark:bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 
                          hover:bg-white/5 dark:hover:bg-white/10 hover:border-white/30 transition-all duration-500 
                          hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] group overflow-hidden">
            
            {/* Subtle top glare sweep */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            {/* Soft inner glow triggered on hover */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none" />

            <div className="relative z-10">
              <div className="text-white/40 font-mono text-xs mb-4 tracking-[0.2em] font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/60 transition-colors" />
                STEP {idx + 1}
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold text-white mb-4 tracking-tight group-hover:text-white transition-colors">
                {step.title}
              </h3>
              <p className="text-[#A1A1AA] leading-relaxed text-sm md:text-base group-hover:text-[#D4D4D8] transition-colors duration-300">
                {step.desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Fixed Timeline Node */}
      <div className="absolute left-[31px] md:static flex items-center justify-center shrink-0 z-10 
                      md:mx-0 w-8 h-8 md:w-16 md:h-16 transform -translate-x-1/2 md:translate-x-0">
        <div 
          className={`relative flex items-center justify-center w-full h-full rounded-full border-2 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isVisible ? "border-white/80 bg-black shadow-[0_0_40px_rgba(255,255,255,0.8)] scale-100" : "border-white/10 bg-black/40 shadow-none scale-[0.6]"}`}
          style={{ transitionDelay: '150ms' }}
        >
          {/* Inner pulse ring */}
          <div className={`absolute inset-[-4px] rounded-full border border-white/30 animate-pulse transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} />
          
          {/* Center glowing Core Icon */}
          <div className={`transition-all duration-1000 delay-300 ${isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
            <step.icon className="w-4 h-4 md:w-6 md:h-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Empty Spacing Side */}
      <div className="hidden md:block flex-1" />
    </div>
  );
}

export default function Timeline() {
  return (
    <section className="py-40 relative bg-[#0D0D0D] overflow-hidden selection:bg-white/20">
      
      {/* Optimized WebGL Background layer */}
      <AnoAI />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Header Block */}
        <div className="text-center mb-32 relative">
          {/* Soft backglow behind text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[100px] bg-white/5 blur-[80px] rounded-full pointer-events-none" />
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-md">
            How Phantom Pipeline Works
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base font-mono tracking-[0.1em] uppercase">
            A fully autonomous engine built on the Forge Stack
          </p>
        </div>

        {/* Timeline Sequence */}
        <div className="relative">
          {/* Continuous Vertical Timeline Line */}
          <div className="absolute left-[31px] md:left-1/2 top-4 bottom-4 w-[2px] md:-translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {/* Wrapper for the steps */}
          <div className="flex flex-col gap-20 md:gap-32 relative py-10">
            {steps.map((step, idx) => (
              <TimelineStep key={idx} step={step} idx={idx} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}