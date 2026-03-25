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
      
      {/* Footer / Booking CTA */}
      <footer className="py-24 bg-[#0a0a0a] border-t border-white/5 text-center">
         <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">Phantom Pipeline Runs on The Forge Stack</h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto">
              Ready to see the entire system live? Book a demo with our team and let us build your first autonomous pipeline.
            </p>
            <a 
              href="https://meetings-eu1.hubspot.com/franksondors/" 
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-black font-semibold py-4 px-8 rounded-full transition-colors text-lg"
            >
              Book a Demo
            </a>
            <div className="mt-20 pt-8 border-t border-white/10 text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} Salesforge Hackathon Entry. All rights reserved.
            </div>
         </div>
      </footer>
    </div>
  )
}
