/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { useEffect, useState } from "react"

export default function LiveCounter() {
  const [counter, setCounter] = useState(0)
  
  // $1,903/month * 3 SDRs = $5,709/mo
  // $5,709 / 30 / 24 / 3600 = $0.0022025/sec
  const lossPerSecond = 0.0022025

  useEffect(() => {
    // Start interval
    const interval = setInterval(() => {
      setCounter(prev => prev + lossPerSecond)
    }, 100) // update every 100ms for smoother visual
    
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-24 border-y border-gray-100 bg-gray-50 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#783FDD]/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 
            className="text-2xl text-gray-600 mb-8 font-medium tracking-wide text-balance animate-in fade-in duration-1000"
          >
            Every Second Without Automation Costs You:
          </h2>
          
          <div 
            className="font-mono text-7xl md:text-8xl lg:text-[140px] font-bold text-[#783FDD] tracking-tighter mb-12 tabular-nums drop-shadow-[0_10px_40px_rgba(120,63,221,0.2)] animate-in fade-in zoom-in-95 duration-1000"
          >
            ${counter.toFixed(2)}
          </div>
          
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm md:text-base text-gray-500 max-w-4xl mx-auto divide-y md:divide-y-0 md:divide-x divide-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-200"
          >
            <div className="pt-4 md:pt-0">Based on:<br/><span className="text-gray-900 font-semibold text-lg block mt-1">3 SDRs @ 3 hrs/day</span></div>
            <div className="pt-4 md:pt-0">Missed monthly:<br/><span className="text-gray-900 font-semibold text-lg block mt-1">~47 qualified demos</span></div>
            <div className="pt-4 md:pt-0">Annual impact:<br/><span className="text-gray-900 font-semibold text-lg block mt-1">$68,508 wasted</span></div>
          </div>
          
          <p className="text-xs text-gray-400 mt-12 font-mono uppercase tracking-widest font-semibold">
            This is what Phantom Pipeline stops. Automatically.
          </p>
      </div>
    </section>
  )
}