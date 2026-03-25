/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { createFileRoute } from '@tanstack/react-router'
import Hero from '../components/Landing/Hero'
import LogoTicker from '../components/ui/LogoTicker'
import Timeline from '../components/Landing/Timeline'
import PilotForm from '../components/Landing/PilotForm'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-[#F59E0B]/30 selection:text-white font-sans">
      <Hero />
      <LogoTicker />
      <Timeline />
      <PilotForm />
      
      {/* Footer / Contact Us */}
      <footer className="py-24 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight text-center">Contact Us</h2>
          <p className="text-white/40 text-sm text-center mb-14">Reach out to anyone on the team directly on LinkedIn</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { name: "Vladyslav N.", href: "https://www.linkedin.com/in/vladyslav-nidzelskyi-38217a3b9/", initials: "VN" },
              { name: "Boris A.", href: "https://www.linkedin.com/in/boris-arutinov-16471233a", initials: "BA" },
              { name: "Oleksii B.", href: "https://www.linkedin.com/in/oleksii-burianov-096648397/", initials: "OB" },
              { name: "Kirill P.", href: "https://www.linkedin.com/in/kirill-pochinchik-6ba461330/", initials: "KP" },
              { name: "Ivan K.", href: "https://www.linkedin.com/in/ivan-kliuss", initials: "IK" },
            ].map((member) => (
              <a
                key={member.name}
                href={member.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 bg-white/5 hover:bg-[#783FDD]/15 border border-white/10 hover:border-[#783FDD]/40 rounded-2xl p-5 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#783FDD]/20 border border-[#783FDD]/30 group-hover:border-[#783FDD]/60 transition-all flex items-center justify-center">
                  <span className="text-[#783FDD] font-bold text-sm group-hover:text-white transition-colors">{member.initials}</span>
                </div>
                <div className="text-white/80 text-xs font-semibold group-hover:text-white transition-colors text-center">{member.name}</div>
              </a>
            ))}
          </div>

          {/* GitHub repo */}
          <div className="mt-10 flex justify-center">
            <a
              href="https://github.com/Borinskii/business-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl px-6 py-4 transition-all"
            >
              <svg className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              <div className="text-left">
                <div className="text-white/80 text-sm font-semibold group-hover:text-white transition-colors">GitHub Repository</div>
                <div className="text-white/30 text-xs">github.com/Borinskii/business-agent</div>
              </div>
            </a>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 text-white/20 text-sm text-center">
            &copy; {new Date().getFullYear()} Salesforge Hackathon Entry. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}