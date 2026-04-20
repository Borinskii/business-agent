/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 */

"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import createGlobe from "cobe"
import { FileText, Video, Banknote, Mailbox, Activity, ExternalLink, X } from "lucide-react"

interface GlobeInteractiveProps {
  className?: string
  speed?: number
  size?: number
  initialPhi?: number
}

interface Marker {
  id: string
  location: [number, number]
  size: number
  label: string
  domain: string
  loss: number
  status: string
  dm: { name: string; email: string; title: string }
  video: string
  pdf: string
}

const MARKERS: Marker[] = [
  {
    id: "shelby", location: [35.15, -90.05], size: 0.06, label: "Shelby County",
    domain: "shelbycountytn.gov", loss: 1903, status: "outreach_sent",
    dm: { name: "Marilene Simplicio", email: "stanley.green@shelbycountytn.gov", title: "SDR Lead" },
    video: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/videos/shelbycountytn-gov.mp4",
    pdf: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/reports/shelbycountytn-gov.pdf",
  },
  {
    id: "devreach", location: [42.70, 23.32], size: 0.06, label: "DevReach",
    domain: "devreach.io", loss: 3806, status: "content_generated",
    dm: { name: "Priya Nair", email: "priya@devreach.io", title: "Founder & CEO" },
    video: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/videos/devreach-io.mp4",
    pdf: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/reports/devreach-io.pdf",
  },
  {
    id: "finstack", location: [51.51, -0.13], size: 0.07, label: "Finstack",
    domain: "finstack.com", loss: 11418, status: "content_generated",
    dm: { name: "Marcus Webb", email: "m.webb@finstack.com", title: "Head of Sales" },
    video: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/videos/finstack-com.mp4",
    pdf: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/reports/finstack-com.pdf",
  },
  {
    id: "talentflow", location: [37.77, -122.42], size: 0.07, label: "TalentFlow",
    domain: "talentflow.io", loss: 5709, status: "content_generated",
    dm: { name: "Sarah Chen", email: "s.chen@talentflow.io", title: "VP of Sales" },
    video: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/videos/talentflow-io.mp4",
    pdf: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/reports/talentflow-io.pdf",
  },
  {
    id: "codefine", location: [43.65, -79.38], size: 0.06, label: "Codefine International",
    domain: "codefine.com", loss: 1903, status: "content_generated",
    dm: { name: "Jack Fridreh", email: "rmartinez@codefine.com", title: "Sales Director" },
    video: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/videos/codefine-com.mp4",
    pdf: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/reports/codefine-com.pdf",
  },
  {
    id: "ecpi", location: [36.85, -75.98], size: 0.06, label: "ECPI University",
    domain: "ecpi.edu", loss: 1903, status: "outreach_sent",
    dm: { name: "Marilene Simplicio", email: "clane-tillerson@ecpi.edu", title: "SDR Lead" },
    video: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/videos/ecpi-edu.mp4",
    pdf: "https://tcpapdgevdynhvoyfoxe.supabase.co/storage/v1/object/public/reports/ecpi-edu.pdf",
  },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    detected:        { label: "Detected",        color: "#64748b", bg: "#f1f5f9" },
    profiled:        { label: "Profiled",         color: "#0369a1", bg: "#e0f2fe" },
    content_generated: { label: "Content Ready", color: "#7c3aed", bg: "#ede9fe" },
    outreach_sent:   { label: "In Sequence",      color: "#0d9488", bg: "#ccfbf1" },
    responded:       { label: "Responded",        color: "#15803d", bg: "#dcfce7" },
  }
  const s = map[status] ?? { label: status.replace(/_/g, " "), color: "#64748b", bg: "#f1f5f9" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "4px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg, letterSpacing: 0.3,
    }}>
      {s.label}
    </span>
  )
}

function CompanyModal({ marker, onClose }: { marker: Marker | null; onClose: () => void }) {
  useEffect(() => {
    if (!marker) return
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [marker, onClose])

  if (!marker) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(15,23,42,0.4)", backdropFilter: "blur(8px)",
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: "fixed", inset: 0, margin: "auto", zIndex: 101,
          width: "min(90vw, 900px)", height: "min(85vh, 680px)",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid rgba(203,213,225,0.6)",
        }}
      >
        {/* macOS header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56", border: "none", cursor: "pointer" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F", display: "inline-block" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            Phantom Autopsy — {marker.label}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* Left: PDF */}
          <div style={{ flex: 1, borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", background: "#f8fafc", minWidth: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13, color: "#334155" }}>
                <FileText size={16} color="#6366f1" />
                Pipeline Autopsy Report (PDF)
              </div>
              <a href={marker.pdf} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                <ExternalLink size={11} /> Open in new tab
              </a>
            </div>
            <iframe src={marker.pdf} style={{ flex: 1, width: "100%", border: "none", minHeight: 0 }} title="Pipeline Autopsy PDF" />
          </div>

          {/* Right: Video + Stats */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", overflowY: "auto", minWidth: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13, color: "#334155", flexShrink: 0 }}>
              <Video size={16} color="#a855f7" />
              Shotstack Video Pitch
            </div>
            <div style={{ padding: 24, paddingBottom: 0 }}>
              <div style={{ width: "100%", aspectRatio: "16/9", background: "#0f172a", borderRadius: 12, overflow: "hidden" }}>
                <video
                  src={marker.video}
                  controls
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            </div>

            {/* Stats grid — matches dashboard exactly */}
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Extraction Stats
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: "#fff1f2", border: "1px solid #fee2e2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#e11d48", marginBottom: 6 }}>
                  <Banknote size={14} /> Est. Monthly Loss
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#be123c" }}>
                  ${marker.loss.toLocaleString()}
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  <Mailbox size={14} /> Target DM
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {marker.dm.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {marker.dm.title}
                </div>
              </div>

              <div style={{ gridColumn: "1/-1", padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  <Activity size={14} /> Pipeline Status
                </div>
                <StatusBadge status={marker.status} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export function GlobeInteractive({
  className = "",
  speed = 0.003,
  size = 800,
  initialPhi = 0,
}: GlobeInteractiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const markerScaleRef = useRef(0)
  const isDraggingRef = useRef(false)
  const isHoveringMarkerRef = useRef(false)
  const didDragRef = useRef(false)

  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null)
  const [activeMarker, setActiveMarker] = useState<Marker | null>(null)
  const markerElementsRef = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    isDraggingRef.current = true
    didDragRef.current = false
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    isDraggingRef.current = false
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    // Reset after click event fires so a post-drag tap on a marker still works
    setTimeout(() => { didDragRef.current = false }, 50)
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const dx = e.clientX - pointerInteracting.current.x
        const dy = e.clientY - pointerInteracting.current.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true
        dragOffset.current = { phi: dx / 300, theta: dy / 1000 }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = initialPhi

    function updateHtmlMarkers(currentPhi: number, currentTheta: number, canvasWidth: number, scale: number) {
      const radius = canvasWidth / 2
      MARKERS.forEach(marker => {
        const el = markerElementsRef.current[marker.id]
        if (!el) return

        const latR     = marker.location[0] * (Math.PI / 180)
        const lngR     = marker.location[1] * (Math.PI / 180)
        const angle    = currentPhi + lngR
        const cosLat   = Math.cos(latR)
        const sinLat   = Math.sin(latR)
        const cosAngle = Math.cos(angle)
        const sinAngle = Math.sin(angle)
        const cosTheta = Math.cos(currentTheta)
        const sinTheta = Math.sin(currentTheta)

        const c2  = cosLat * cosAngle
        const s2  = cosLat * sinAngle * sinTheta + sinLat * cosTheta
        const viz = sinLat * sinTheta - cosLat * sinAngle * cosTheta

        if (viz > 0.15) {
          el.style.display = "block"
          const screenX = c2 * radius * 0.87 + radius
          const screenY = -s2 * radius * 0.87 + radius
          el.style.transformOrigin = "0 0"
          el.style.transform = `translate(${screenX}px, ${screenY}px)`
          el.style.opacity = "1"
          el.style.zIndex = Math.round(viz * 100).toString()
          el.style.pointerEvents = "auto"
        } else {
          el.style.display = "none"
        }
      })
    }

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width, height: width, phi: 0, theta: 0.15, dark: 0, diffuse: 1.2,
        mapSamples: 16000, mapBrightness: 8,
        baseColor: [0.95, 0.95, 1], markerColor: [0.47, 0.25, 0.87], glowColor: [0.6, 0.45, 0.9],
        markers: [],
      })
      function animate() {
        if (!isDraggingRef.current && !isHoveringMarkerRef.current) phi += speed
        const currentPhi   = phi + phiOffsetRef.current + dragOffset.current.phi
        const currentTheta = 0.15 + thetaOffsetRef.current + dragOffset.current.theta
        globe!.update({ phi: currentPhi, theta: currentTheta, markers: [] })
        updateHtmlMarkers(currentPhi, currentTheta, width, 1)
        animationId = requestAnimationFrame(animate)
      }
      animate()
      setTimeout(() => { if (canvas) canvas.style.opacity = "1" }, 100)
    }

    if (canvas.offsetWidth > 0) { init() } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) { ro.disconnect(); init() }
      })
      ro.observe(canvas)
    }
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [speed])

  return (
    <>
      {activeMarker && (
        <CompanyModal marker={activeMarker} onClose={() => setActiveMarker(null)} />
      )}
      <div className={`relative select-none ${className}`} style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          style={{
            width: "100%", height: "100%", cursor: "grab", opacity: 0,
            transition: "opacity 1.2s ease", borderRadius: "50%", touchAction: "none",
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          {MARKERS.map((marker) => (
            <div
              key={marker.id}
              ref={(el) => { markerElementsRef.current[marker.id] = el }}
              className="absolute top-0 left-0 pointer-events-auto"
              style={{ display: "none" }}
              onMouseEnter={() => { isHoveringMarkerRef.current = true; setHoveredMarker(marker.id) }}
              onMouseLeave={() => { isHoveringMarkerRef.current = false; setHoveredMarker(null) }}
              onClick={() => { if (!didDragRef.current) setActiveMarker(marker) }}
            >
              {/* Beacon: base at globe surface, rises upward */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                transform: "translate(-50%, -100%)",
                cursor: "pointer", position: "relative",
              }}>
                {/* Hover card — above the pulsing dot */}
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "#fff", border: "1px solid rgba(120,63,221,0.15)",
                  borderRadius: 14, pointerEvents: "none", width: 220,
                  boxShadow: "0 16px 48px rgba(120,63,221,0.18)",
                  opacity: hoveredMarker === marker.id ? 1 : 0,
                  transition: "opacity 0.15s",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#783FDD", display: "inline-block" }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#783FDD", textTransform: "uppercase", letterSpacing: 1 }}>Pipeline Autopsy</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{marker.label}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{marker.domain}</div>
                  </div>
                  <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#64748b" }}>Monthly loss</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#be123c" }}>${marker.loss.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#64748b" }}>Decision maker</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#334155" }}>{marker.dm.name.split(" ")[0]} {marker.dm.name.split(" ").slice(-1)[0]}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#64748b" }}>Status</span>
                      <StatusBadge status={marker.status} />
                    </div>
                  </div>
                  <div style={{ padding: "6px 12px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", fontSize: 9, color: "#94a3b8", textAlign: "center" }}>
                    Click to open full report
                  </div>
                  <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "7px solid #fff" }} />
                </div>

                {/* Pulsing dot at beacon top */}
                <div style={{ position: "relative", width: 32, height: 32, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                  <span className="absolute inline-flex w-6 h-6 rounded-full bg-[#783FDD]/35 animate-ping" />
                  <span className="absolute inline-flex w-4 h-4 rounded-full bg-[#783FDD]/20 animate-ping [animation-delay:0.4s]" />
                  <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#783FDD] shadow-[0_0_8px_3px_rgba(120,63,221,0.55)]" />
                </div>

                {/* Stem */}
                <div style={{
                  width: 2, height: 18, marginTop: -6,
                  background: "linear-gradient(to bottom, #783FDD, rgba(120,63,221,0.15))",
                  borderRadius: "0 0 2px 2px",
                }} />

                {/* Base dot on globe surface */}
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#783FDD", opacity: 0.45,
                  boxShadow: "0 0 4px 2px rgba(120,63,221,0.3)",
                  marginTop: -1,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
