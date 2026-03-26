"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import createGlobe from "cobe"

interface GlobeInteractiveProps {
  className?: string
  speed?: number
  size?: number
  initialPhi?: number  // rotation offset in radians (1.0 ≈ 57° shows Americas)
}

const MARKERS = [
  { id: "riga", location: [56.95, 24.11], size: 0.05, label: "Riga" },
]

export function GlobeInteractive({
  className = "",
  speed = 0.003,
  size = 800,
  initialPhi = 0,
}: GlobeInteractiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Interaction refs
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const markerScaleRef = useRef(0)
  
  // Pause rotating when dragging or hovering a marker
  const isDraggingRef = useRef(false)
  const isHoveringMarkerRef = useRef(false)
  
  // Popup state
  const [activeMarker, setActiveMarker] = useState<string | null>(null)
  const markerElementsRef = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    isDraggingRef.current = true
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
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
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

        const latR = marker.location[0] * (Math.PI / 180)
        const lngR = marker.location[1] * (Math.PI / 180)

        // Mirror cobe's exact internal coordinate system (from cobe source U([lat,lng])):
        //   x = cos(lat)*cos(lng),  y = sin(lat),  z = -cos(lat)*sin(lng)
        // Then cobe's projection O(t) with phi (f) and theta (l):
        //   c2  = cos(phi)*x + sin(phi)*z          → maps to screen X
        //   s2  = sin(phi)*sin(theta)*x + cos(theta)*y - cos(phi)*sin(theta)*z → screen Y
        //   viz = -sin(phi)*cos(theta)*x + sin(theta)*y + cos(phi)*cos(theta)*z → depth
        // Simplified with angle = phi + lng:
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

        // Only show when clearly on the front face (viz > 0.15 avoids the limb/edge)
        if (viz > 0.15 && scale > 0.01) {
          el.style.display = "block"
          // 0.95 keeps the dot firmly inside the globe surface, away from the glow edge
          const screenX = c2 * radius * 0.95 + radius
          const screenY = -s2 * radius * 0.95 + radius

          // Use opacity for fade-in; don't apply scale() to the transform so
          // CSS transform-origin doesn't shift the dot's position during animation
          el.style.transformOrigin = "0 0"
          el.style.transform = `translate(${screenX}px, ${screenY}px)`
          el.style.opacity = String(Math.min(1, scale * 1.5))
          el.style.zIndex = Math.round(viz * 100).toString()
          el.style.pointerEvents = scale > 0.9 ? "auto" : "none"
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
        width,
        height: width,
        phi: 0,
        theta: 0.15,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 8,
        baseColor: [0.95, 0.95, 1],
        markerColor: [0.47, 0.25, 0.87],  // #783FDD purple
        glowColor: [0.6, 0.45, 0.9],
        markers: [],
      })

      function animate() {
        if (!isDraggingRef.current && !isHoveringMarkerRef.current) {
          phi += speed
        }
        
        const currentPhi = phi + phiOffsetRef.current + dragOffset.current.phi
        const currentTheta = 0.15 + thetaOffsetRef.current + dragOffset.current.theta
        
        const p3 = (window as any).globeP3 || 0
        const isMarkersVisible = p3 > 0.8
        
        markerScaleRef.current += ((isMarkersVisible ? 1 : 0) - markerScaleRef.current) * 0.15
        
        globe!.update({
          phi: currentPhi,
          theta: currentTheta,
          markers: []
        })
        
        // Update HTML markers positions
        updateHtmlMarkers(currentPhi, currentTheta, width, markerScaleRef.current)
        
        animationId = requestAnimationFrame(animate)
      }
      
      animate()
      setTimeout(() => { if (canvas) canvas.style.opacity = "1" }, 100)
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [speed])

  return (
    <div className={`relative select-none ${className}`} style={{ width: size, height: size }}>
      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      
      {/* HTML Markers Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {MARKERS.map((marker) => (
          <div
            key={marker.id}
            ref={(el) => {
              markerElementsRef.current[marker.id] = el
            }}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ display: "none" }}
            onMouseEnter={() => {
              isHoveringMarkerRef.current = true
              setActiveMarker(marker.id)
            }}
            onMouseLeave={() => {
              isHoveringMarkerRef.current = false
              setActiveMarker(null)
            }}
          >
            {/* Interactive Hit Area */}
            <div className="w-16 h-16 -ml-8 -mt-8 rounded-full cursor-pointer relative group flex justify-center items-center">

              {/* Pulsing rings */}
              <span className="absolute inline-flex w-5 h-5 rounded-full bg-[#783FDD]/40 animate-ping" />
              <span className="absolute inline-flex w-3 h-3 rounded-full bg-[#783FDD]/25 animate-ping [animation-delay:0.4s]" />

              {/* Solid center dot */}
              <span
                className="relative inline-flex w-3 h-3 rounded-full bg-[#783FDD] shadow-[0_0_8px_3px_rgba(120,63,221,0.5)] transition-transform duration-200 group-hover:scale-125"
              />

              {/* Popup */}
              <div
                className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white border border-[#783FDD]/20 rounded-2xl shadow-[0_20px_60px_rgba(120,63,221,0.18)] w-72 transition-all duration-300 pointer-events-none origin-bottom overflow-hidden ${
                  activeMarker === marker.id
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-3 scale-95'
                }`}
              >
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#783FDD] animate-pulse" />
                    <span className="text-xs font-bold text-[#783FDD] uppercase tracking-widest">Pipeline Autopsy</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">{marker.label}</div>
                </div>

                {/* Video slot — вставь src когда будет готово видео */}
                <div className="relative w-full aspect-video bg-gray-950">
                  <video
                    className="w-full h-full object-cover"
                    src=""
                    controls={false}
                    muted
                    loop
                    playsInline
                    // src="https://your-video-url.mp4"
                  />
                  {/* Overlay — исчезнет когда появится src */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950">
                    <div className="w-11 h-11 rounded-full bg-[#783FDD]/15 border border-[#783FDD]/30 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#783FDD">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <span className="text-[#783FDD]/50 text-[10px] uppercase tracking-[0.2em] font-semibold">
                      Video incoming
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3">
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Personalized Sora-AI report generated for this company in&nbsp;
                    <span className="text-gray-700 font-semibold">1.4s</span>
                  </p>
                </div>

                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
