import { createFileRoute } from '@tanstack/react-router'
import Hero from '../components/Landing/Hero'
import LiveCounter from '../components/Landing/LiveCounter'
import Timeline from '../components/Landing/Timeline'
import PilotForm from '../components/Landing/PilotForm'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-[#F59E0B]/30 selection:text-white font-sans">
      <Hero />
      <LiveCounter />
      <Timeline />
      <PilotForm />
      
      {/* Footer / Contact Us */}
      <footer className="py-24 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight text-center">Contact Us</h2>
          <p className="text-white/40 text-sm text-center mb-14">Reach out to anyone on the team directly on LinkedIn</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <a
                key={i}
                href="#"
                className="group flex flex-col items-center gap-3 bg-white/5 hover:bg-[#783FDD]/15 border border-white/10 hover:border-[#783FDD]/40 rounded-2xl p-5 transition-all"
              >
                {/* Avatar placeholder */}
                <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 group-hover:border-[#783FDD]/40 transition-all flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/20 group-hover:text-[#783FDD]/60 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                {/* Name placeholder */}
                <div className="w-16 h-2.5 rounded-full bg-white/10 group-hover:bg-[#783FDD]/20 transition-colors" />
              </a>
            ))}
          </div>

          {/* GitHub repo */}
          <div className="mt-10 flex justify-center">
            <a
              href="#"
              className="group inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl px-6 py-4 transition-all"
            >
              <svg className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              <div className="text-left">
                <div className="text-white/80 text-sm font-semibold group-hover:text-white transition-colors">GitHub Repository</div>
                <div className="text-white/30 text-xs">github.com/...</div>
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
