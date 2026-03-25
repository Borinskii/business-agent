/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { useEffect, useRef } from "react"
import { GlobeInteractive } from "@/components/ui/cobe-globe-interactive"

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? "http://localhost:3000"

export default function Hero() {
  const globeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number

    const ease = (p: number) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

    // Clamp and normalise a sub-range of rawP to [0,1]
    const subRange = (rawP: number, from: number, to: number) =>
      ease(Math.min(Math.max((rawP - from) / (to - from), 0), 1))

    const update = () => {
      const H = window.innerHeight
      const W = window.innerWidth
      const GLOBE_SIZE = Math.min(W * 0.9, 800)
      const HALF = GLOBE_SIZE / 2
      const BOTTOM_OFFSET = 50    // positive = lower the globe down

      // Total sticky scroll distance = 3 × viewport heights
      const totalRange = H * 3
      const rawP = Math.min(Math.max(window.scrollY / totalRange, 0), 1)

      // ── Phase 1 (0 → 0.33): title fades out, globe rises to center ──────
      const p1 = subRange(rawP, 0, 0.33)

      // ── Phase 2 (0.33 → 0.66): pause at center ───────────────────────────
      // (nothing extra to compute, globe just sits centered)

      // ── Phase 3 (0.66 → 1): globe slides right, CTA fades in on left ─────
      const p3 = subRange(rawP, 0.66, 1)

      // Globe: vertical rise in phase 1, then horizontal shift in phase 3
      if (globeRef.current) {
        const tyPhase1 = HALF * (1 - p1) + BOTTOM_OFFSET   // rises; +OFFSET keeps top from being clipped
        const txPhase3 = (W * 0.22) * p3
        globeRef.current.style.transform = `translateY(${tyPhase1}px) translateX(${txPhase3}px)`
        globeRef.current.style.pointerEvents = p3 > 0.8 ? "auto" : "none"
        ;(window as any).globeP3 = p3
      }

      // Title: fades out in first half of phase 1
      if (titleRef.current) {
        const fade = 1 - p1 * 3.5  // fades out fast before globe can overlap text
        titleRef.current.style.opacity = String(Math.max(0, fade))
        titleRef.current.style.transform = `translateY(${-p1 * 40}px)`
      }

      // CTA panel: fades in during phase 3
      if (ctaRef.current) {
        ctaRef.current.style.opacity = String(p3)
        ctaRef.current.style.transform = `translateX(${-30 + 30 * p3}px)`
        ctaRef.current.style.pointerEvents = p3 > 0.8 ? "auto" : "none"
      }
    }

    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }

    update()
    window.scrollTo(0, 0)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const globeSize = typeof window !== "undefined"
    ? Math.min(window.innerWidth * 0.9, 800)
    : 800

  return (
    // 4 × 100vh so there is enough scroll room for all 3 phases
    <section className="relative w-full bg-white isolate h-[400vh] overscroll-none">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-end">

        {/* ── Phase 1 title ── */}
        <div
          ref={titleRef}
          className="absolute top-0 left-0 right-0 flex flex-col items-center pt-4 px-6 z-30 pointer-events-none"
          style={{ willChange: "opacity, transform" }}
        >
          <span className="inline-flex items-center py-1 px-4 rounded-full border border-[#783FDD]/30 text-[#783FDD] text-xs font-bold mb-5 uppercase tracking-[0.2em]">
            Autonomous AI SDR
          </span>
          <h1 className="text-5xl md:text-[5.5rem] font-extrabold tracking-tight text-gray-900 leading-[1] text-center mb-4">
            Phantom<br />
            <span className="text-[#783FDD]">Pipeline</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 font-light max-w-xl text-center">
            We built your sales report, generated your video, and sent it — before you even heard about us.
          </p>
          <div className="mt-8 flex flex-col items-center gap-1 animate-bounce opacity-60">
            <div className="w-px h-6 bg-gray-400" />
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* ── Phase 3 CTA (appears on the left) ── */}
        <div
          ref={ctaRef}
          className="absolute left-0 top-0 h-full w-[45%] flex flex-col justify-center pl-12 xl:pl-20 z-30"
          style={{ opacity: 0, transform: "translateX(-30px)", willChange: "opacity, transform", pointerEvents: "none" }}
        >
          <span className="inline-flex items-center w-max py-1 px-3 rounded-full bg-[#783FDD]/10 border border-[#783FDD]/20 text-[#783FDD] text-xs font-bold mb-6 uppercase tracking-widest">
            Scalable Growth
          </span>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-gray-900 leading-[1.1] mb-6">
            Personalized,<br />
            <span className="text-[#783FDD]">scalable</span><br />
            client acquisition<br />
            system
          </h2>
          <p className="text-lg text-gray-500 font-light leading-relaxed mb-10 max-w-md">
            Phantom Pipeline automatically finds, qualifies, and contacts your ideal clients — 24/7, without an SDR team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => { window.location.href = DASHBOARD_URL }}
              className="bg-[#783FDD] hover:bg-[#6032B0] text-white font-semibold py-4 px-8 rounded-full text-lg shadow-[0_10px_40px_rgba(120,63,221,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              Launch Auto-SDR
            </button>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-6 mt-12 pt-8 border-t border-gray-100 max-w-sm">
            <div>
              <div className="text-3xl font-bold text-gray-900">1.4s</div>
              <div className="text-sm text-gray-500">Report Generation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#783FDD]">100%</div>
              <div className="text-sm text-gray-500">Autopilot</div>
            </div>
          </div>
        </div>

        {/* ── Globe ── centered, then shifts right in phase 3 */}
        <div
          ref={globeRef}
          className="flex-shrink-0 z-20"
          style={{ willChange: "transform" }}
        >
          <GlobeInteractive
            size={globeSize}
            speed={0.003}
            initialPhi={1.1}   // ~63° — puts Americas front-and-center
          />
        </div>

      </div>
    </section>
  )
}