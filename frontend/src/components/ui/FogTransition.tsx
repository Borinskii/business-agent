/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

/**
 * FogTransition — atmospheric mist layer between sections.
 *
 * Props:
 *   fromLight  — set to true when the PREVIOUS section is light/white
 *   fromDark   — set to true when the PREVIOUS section is dark (default behaviour)
 */

interface FogTransitionProps {
  fromLight?: boolean;
}

const FogTransition = ({ fromLight = false }: FogTransitionProps) => {
  if (fromLight) {
    // White Hero  →  Dark section
    // We render a taller block that smoothly fades white into near-black
    // with a soft purple/blue midtone to avoid a harsh grey band
    return (
      <div
        className="relative w-full pointer-events-none select-none overflow-hidden"
        style={{ height: 220, marginTop: -60, zIndex: 20 }}
        aria-hidden="true"
      >
        {/* Step 1 – base fade white → black */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, #ffffff 0%, #e8e4f8 18%, #c5b8f0 30%, #3b2060 50%, #0D0D0D 78%, #0D0D0D 100%)',
          }}
        />

        {/* Step 2 – soft radial glow in the centre to feel like "light leaking" */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 50% 40%, rgba(120,63,221,0.18) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
        />

        {/* Step 3 – subtle noise-like banding breaker (very gentle blur pass) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(120,63,221,0.07) 45%, transparent 100%)',
            filter: 'blur(40px)',
          }}
        />
      </div>
    );
  }

  // Dark → Dark (default)
  return (
    <div
      className="relative w-full pointer-events-none select-none"
      style={{ height: 140, marginTop: -70, marginBottom: -70, zIndex: 20 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, #0D0D0D 45%, #0D0D0D 55%, transparent 100%)',
          opacity: 0.9,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '60%',
          height: '100px',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
          filter: 'blur(28px)',
        }}
      />
    </div>
  );
};

export default FogTransition;