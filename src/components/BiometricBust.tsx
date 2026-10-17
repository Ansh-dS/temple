'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

export type AutoState =
  | 'SYMPATHETIC OVERDRIVE'
  | 'CERVICAL STRAIN // FATIGUE'
  | 'GRAVITY INVERSION // HYPER-PERFUSION'
  | 'COHERENT FLOW // OPTIMAL EASE';

interface BiometricBustProps {
  finish: string;
  angle: number;
  onAngleChange: (angle: number) => void;
  detectedState: AutoState;
  brainFlow: number;
  entropy: number;
  bpm: number;
  agitationLevel: number;
  cervicalLoadLbs: number;
}

export default function BiometricBust({
  finish,
  angle = 0,
  onAngleChange,
  detectedState = 'COHERENT FLOW // OPTIMAL EASE',
  brainFlow = 88,
  entropy = 32,
  bpm = 58,
  agitationLevel = 0,
  cervicalLoadLbs = 12,
}: BiometricBustProps) {
  const safeAngle = Number.isFinite(angle) ? angle : 0;
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 58;
  const safeBrainFlow = Number.isFinite(brainFlow) ? brainFlow : 88;
  const safeEntropy = Number.isFinite(entropy) ? entropy : 32;
  const safeAgitation = Number.isFinite(agitationLevel) ? agitationLevel : 0;
  const safeLoad = Number.isFinite(cervicalLoadLbs) ? cervicalLoadLbs : 12;

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startPointerAngleRef = useRef(0);
  const startHeadAngleRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Pulse animation loop tied to live calculated BPM
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const period = (60 / Math.max(40, safeBpm)) * 1000;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (Number.isFinite(dt) && Number.isFinite(period) && period > 0) {
        setPulsePhase((prev) => (prev + dt / period) % 1);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [safeBpm]);

  // Compute angle from container center (190, 190)
  const getAngleFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    return deg;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      setIsDragging(true);
      const pointerDeg = getAngleFromPointer(e.clientX, e.clientY);
      startPointerAngleRef.current = pointerDeg;
      startHeadAngleRef.current = angle;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [angle, getAngleFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const currentPointerDeg = getAngleFromPointer(e.clientX, e.clientY);
      let delta = currentPointerDeg - startPointerAngleRef.current;

      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const newAngle = Math.max(-90, Math.min(90, Math.round(startHeadAngleRef.current + delta)));
      onAngleChange(newAngle);
    },
    [getAngleFromPointer, onAngleChange]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 3 : -3;
      onAngleChange(Math.max(-90, Math.min(90, angle + delta)));
    },
    [angle, onAngleChange]
  );

  /* ─── DYNAMIC PHYSIOLOGICAL & BIOMECHANICAL VISUAL PARAMETERS ─── */

  const inversionFactor = Math.max(0, -safeAngle / 90); // 0 at 0°, 1 at -90°

  const isSympathetic = detectedState === 'SYMPATHETIC OVERDRIVE';
  const isCervicalStrain = detectedState === 'CERVICAL STRAIN // FATIGUE';
  const isInversion = detectedState === 'GRAVITY INVERSION // HYPER-PERFUSION';

  // Vessel stroke width (vasodilation vs vasoconstriction)
  const vesselWidth = isSympathetic
    ? 2.2
    : isCervicalStrain
    ? 2.6
    : isInversion
    ? 4.6
    : 4.0;

  // Primary blood flow color
  const vesselColor = isSympathetic
    ? '#ef4444' // Crimson stress
    : isCervicalStrain
    ? '#f97316' // Amber warning (tech-neck)
    : isInversion
    ? '#38bdf8' // Electric cyan arterial surge
    : '#34d399'; // Emerald calm laminar flow

  // Brain cortex oxygenation bloom scaled directly with brainFlow (58 BF = dim, 99.4 BF = radiant)
  const cortexBloomRatio = Math.max(0.18, Math.min(1.0, (safeBrainFlow - 52) / 47.4));
  const cortexGlowIntensity = isCervicalStrain
    ? 0.25 // Dimmed frontal cortex during tech-neck fatigue
    : 0.3 + cortexBloomRatio * 0.65;

  const cortexColor = isSympathetic
    ? 'rgba(239, 68, 68, 0.8)'
    : isCervicalStrain
    ? 'rgba(249, 115, 22, 0.5)'
    : isInversion
    ? 'rgba(56, 189, 248, 0.9)'
    : 'rgba(52, 211, 153, 0.8)';

  // Blood particle speed (accelerates with inversion, slows down with cervical slump/strain)
  const baseSpeed = safeBpm / 60;
  const particleSpeed = isCervicalStrain
    ? baseSpeed * 0.65
    : isInversion
    ? baseSpeed * (1 + inversionFactor * 2.2)
    : isSympathetic
    ? baseSpeed * 1.5
    : baseSpeed;

  // Sympathetic micro-tremor when agitation > 35 (pure deterministic calculation)
  const isAgitated = safeAgitation > 35 || isSympathetic;
  const jitterIntensity = isAgitated ? Math.min(2.5, (safeAgitation / 100) * 2.5) : 0;
  const jitterX = jitterIntensity > 0 ? Math.sin(pulsePhase * Math.PI * 8) * jitterIntensity : 0;
  const jitterY = jitterIntensity > 0 ? Math.cos(pulsePhase * Math.PI * 6) * jitterIntensity : 0;

  // Gimbal protractor settings
  const GIMBAL_R = 168;
  const CX = 190;
  const CY = 190;
  const gimbalAngles = [-90, -60, -30, 0, 30, 60, 90];

  const handleRad = ((safeAngle - 90) * Math.PI) / 180;
  const handleX = CX + Math.cos(handleRad) * GIMBAL_R;
  const handleY = CY + Math.sin(handleRad) * GIMBAL_R;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className="relative flex items-center justify-center select-none aspect-square w-auto h-full max-w-full max-h-full"
      style={{
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* ── 1. GIMBAL PROTRACTOR RING & TICKS (-90° to +90°) ──────── */}
      <svg
        viewBox="0 0 380 380"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <circle
          cx={CX}
          cy={CY}
          r={GIMBAL_R}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={1.5}
          strokeDasharray="4 6"
        />

        {/* Active Arc from 0° to current angle */}
        <path
          d={(() => {
            const startAng = -90;
            const endAng = -90 + safeAngle;
            const startRad = (startAng * Math.PI) / 180;
            const endRad = (endAng * Math.PI) / 180;
            const x1 = CX + Math.cos(startRad) * GIMBAL_R;
            const y1 = CY + Math.sin(startRad) * GIMBAL_R;
            const x2 = CX + Math.cos(endRad) * GIMBAL_R;
            const y2 = CY + Math.sin(endRad) * GIMBAL_R;
            const largeArc = Math.abs(safeAngle) > 180 ? 1 : 0;
            const sweep = safeAngle >= 0 ? 1 : 0;
            return `M ${x1} ${y1} A ${GIMBAL_R} ${GIMBAL_R} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
          })()}
          fill="none"
          stroke={vesselColor}
          strokeWidth={3}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${vesselColor})`,
          }}
        />

        {/* Angle Ticks & Labels */}
        {gimbalAngles.map((ang) => {
          const rad = ((ang - 90) * Math.PI) / 180;
          const x1 = CX + Math.cos(rad) * (GIMBAL_R - 8);
          const y1 = CY + Math.sin(rad) * (GIMBAL_R - 8);
          const x2 = CX + Math.cos(rad) * (GIMBAL_R + 8);
          const y2 = CY + Math.sin(rad) * (GIMBAL_R + 8);
          const tx = CX + Math.cos(rad) * (GIMBAL_R - 22);
          const ty = CY + Math.sin(rad) * (GIMBAL_R - 22);
          const isCurrent = Math.abs(safeAngle - ang) < 6;

          return (
            <g key={ang}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCurrent ? vesselColor : 'rgba(255,255,255,0.2)'}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
                fill={isCurrent ? vesselColor : 'rgba(255,255,255,0.35)'}
                fontWeight={isCurrent ? 'bold' : 'normal'}
              >
                {ang > 0 ? `+${ang}°` : `${ang}°`}
              </text>
            </g>
          );
        })}

        {/* Clean Center Pivot Indicator */}
        <g transform={`translate(${CX}, 235)`} opacity={0.25}>
          <circle cx={0} cy={0} r={6} fill="none" stroke="#ffffff" strokeWidth={1} />
          <circle cx={0} cy={0} r={2} fill="#ffffff" />
        </g>
      </svg>

      {/* ── 2. ROTATABLE ANATOMICAL BUST ──────────────────────────── */}
      <motion.div
        style={{
          transformOrigin: '50% 61.842%',
        }}
        animate={{
          rotate: safeAngle,
          x: jitterX,
          y: jitterY,
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="relative flex items-center justify-center pointer-events-none w-full h-full"
      >
        <svg
          viewBox="0 0 380 380"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <filter id="cortexGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="arteryNeon" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id="cortexRadial" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor={cortexColor} stopOpacity={cortexGlowIntensity} />
              <stop offset="70%" stopColor={cortexColor} stopOpacity={cortexGlowIntensity * 0.4} />
              <stop offset="100%" stopColor={cortexColor} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Anatomical Human Profile Silhouette */}
          <path
            d="
              M 270 330
              C 255 290 240 260 236 230
              C 232 205 242 190 254 170
              C 268 145 270 110 252 78
              C 232 50 196 46 168 54
              C 142 64 126 84 120 108
              C 118 116 117 122 114 126
              C 110 133 102 143 96 148
              C 100 154 108 156 116 158
              C 118 162 116 166 112 170
              C 116 172 119 174 114 178
              C 110 182 116 186 118 190
              C 120 196 118 204 126 210
              C 134 214 155 216 175 212
              C 152 225 146 245 148 265
              C 150 285 140 305 110 330
            "
            fill="rgba(255, 255, 255, 0.02)"
            stroke={isAgitated ? '#f87171' : 'rgba(255, 255, 255, 0.3)'}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Eye Orbit & Brow */}
          <path
            d="M 125 118 C 130 116 138 118 144 124"
            fill="none"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth={1.2}
          />
          <circle cx={135} cy={128} r={3} fill="rgba(255, 255, 255, 0.12)" />

          {/* Anatomical Ear */}
          <g opacity={0.35}>
            <path
              d="
                M 194 140
                C 186 135 180 142 182 152
                C 184 162 188 174 196 180
                C 202 185 208 180 208 172
                C 208 158 206 148 194 140 Z
              "
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.2}
            />
            <path
              d="M 190 152 C 188 158 190 166 196 168"
              fill="none"
              stroke="#ffffff"
              strokeWidth={1}
            />
          </g>

          {/* ── Cervical Spine (C1–C7) with Live Weight Load Glow ── */}
          <g>
            {[235, 250, 265, 280, 295, 310].map((y, idx) => {
              const isLoaded = safeAngle > 18;
              const loadColor = safeLoad > 40 ? '#ef4444' : safeLoad > 20 ? '#f97316' : '#ffffff';
              return (
                <rect
                  key={idx}
                  x={185}
                  y={y}
                  width={15}
                  height={9}
                  rx={2.5}
                  fill={isLoaded ? `${loadColor}33` : 'none'}
                  stroke={isLoaded ? loadColor : '#ffffff'}
                  strokeWidth={isLoaded ? 1.6 : 1}
                  opacity={isLoaded ? 0.95 : 0.16}
                  style={{
                    filter: isLoaded ? `drop-shadow(0 0 6px ${loadColor})` : 'none',
                  }}
                />
              );
            })}
          </g>

          {/* Cervical Load Micro-Callout when tilted forward */}
          {safeAngle > 18 && (
            <g transform="translate(208, 275)">
              <line x1={0} y1={0} x2={16} y2={0} stroke="#f97316" strokeWidth={1} />
              <rect
                x={18}
                y={-11}
                width={94}
                height={22}
                rx={6}
                fill="#08080c"
                stroke={safeLoad > 40 ? '#ef4444' : '#f97316'}
                strokeWidth={1}
              />
              <text
                x={65}
                y={3.5}
                textAnchor="middle"
                fontSize="8"
                fontFamily="'Inter', system-ui, sans-serif"
                fontWeight="600"
                fill={safeLoad > 40 ? '#ef4444' : '#f97316'}
              >
                Neck Load: {Math.round(safeLoad)} lbs
              </text>
            </g>
          )}

          {/* ── Cerebral Cortex with Live Oxygenation Bloom ────────── */}
          <g filter="url(#cortexGlow)">
            <path
              d="
                M 132 115
                C 128 85 155 64 185 60
                C 225 56 256 75 258 110
                C 260 135 252 155 240 165
                C 225 174 205 174 185 170
                C 160 165 136 145 132 115 Z
              "
              fill="url(#cortexRadial)"
            />

            {/* Cortical Sulci Fissures */}
            <path
              d="
                M 160 75 Q 180 95 190 120
                M 200 68 Q 210 98 215 132
                M 235 85 Q 232 112 225 142
                M 142 110 Q 170 120 195 125
                M 165 140 Q 195 145 230 150
              "
              fill="none"
              stroke={cortexColor}
              strokeWidth={1.2}
              opacity={cortexBloomRatio}
            />

            {/* Sympathetic Jitter Ring for Sympathetic Overdrive */}
            {isSympathetic && (
              <circle
                cx={170}
                cy={105}
                r={28}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                opacity={0.8}
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 170 105"
                  to="360 170 105"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Hyper-Perfusion Inversion Bloom */}
            {isInversion && (
              <circle
                cx={195}
                cy={115}
                r={44}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="6 6"
                opacity={0.75}
              />
            )}
          </g>

          {/* ── Carotid & Superficial Temporal Artery Tree ─────────── */}
          <g filter="url(#arteryNeon)">
            <path
              d="
                M 190 320
                C 188 285 186 255 182 225
              "
              fill="none"
              stroke={vesselColor}
              strokeWidth={vesselWidth}
              strokeLinecap="round"
              opacity={0.9}
            />

            <path
              d="
                M 182 225
                C 186 200 195 185 210 165
                C 222 150 234 135 242 120
              "
              fill="none"
              stroke={vesselColor}
              strokeWidth={vesselWidth * 0.75}
              strokeLinecap="round"
              opacity={0.85}
            />

            <path
              d="
                M 182 225
                C 180 195 178 165 174 140
                C 172 134 170 128 168 122
              "
              fill="none"
              stroke={vesselColor}
              strokeWidth={vesselWidth * 0.8}
              strokeLinecap="round"
              opacity={0.95}
            />

            {/* Animated Blood Flow Packets */}
            <path
              d="
                M 190 320
                C 188 285 186 255 182 225
                C 180 195 178 165 174 140
                C 172 134 170 128 168 122
              "
              fill="none"
              stroke="#ffffff"
              strokeWidth={vesselWidth * 0.65}
              strokeDasharray="6 14"
              strokeDashoffset={-pulsePhase * 90 * particleSpeed}
              strokeLinecap="round"
              opacity={0.9}
            />

            <path
              d="
                M 182 225
                C 186 200 195 185 210 165
                C 222 150 234 135 242 120
              "
              fill="none"
              stroke="#ffffff"
              strokeWidth={vesselWidth * 0.55}
              strokeDasharray="5 12"
              strokeDashoffset={-pulsePhase * 80 * particleSpeed}
              strokeLinecap="round"
              opacity={0.8}
            />
          </g>

          {/* ── Miniature Glowing Temple Pill on Temple Region ────── */}
          <g transform="translate(168, 124) rotate(-10)">
            <polygon
              points="0,-8 18,-14 18,14 0,8"
              fill={vesselColor}
              opacity={0.9}
              filter="url(#arteryNeon)"
            />

            <rect
              x={-18}
              y={-9}
              width={34}
              height={18}
              rx={9}
              fill="var(--metal-base)"
              stroke={vesselColor}
              strokeWidth={1.8}
              style={{
                filter: `drop-shadow(0 0 10px ${vesselColor})`,
              }}
            />

            <rect
              x={-14}
              y={-6}
              width={26}
              height={12}
              rx={6}
              fill="#08080c"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.8}
            />

            <circle cx={-7} cy={0} r={2.4} fill={vesselColor} />
            <circle cx={-7} cy={0} r={1.2} fill="#ffffff" />
            <circle cx={3} cy={0} r={2.4} fill={vesselColor} />
            <circle cx={3} cy={0} r={1.2} fill="#ffffff" />
            <circle cx={-2} cy={0} r={1.4} fill="rgba(255,255,255,0.4)" />

            <line
              x1={-18}
              y1={0}
              x2={-38}
              y2={0}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={1}
            />
            <text
              x={-42}
              y={3}
              textAnchor="end"
              fontSize="7.5"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="600"
              fill={vesselColor}
              letterSpacing="0.12em"
            >
              TEMPLE GEN-02
            </text>
          </g>
        </svg>
      </motion.div>

      {/* ── 3. CLEAR TACTILE DRAG HANDLE / ROTATION POINT ─────────── */}
      <div
        className="absolute z-30 pointer-events-auto"
        style={{
          left: `${(handleX / 380) * 100}%`,
          top: `${(handleY / 380) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onPointerEnter={() => setIsHoveringHandle(true)}
        onPointerLeave={() => setIsHoveringHandle(false)}
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 40,
              height: 40,
              background: `radial-gradient(circle, ${vesselColor}44 0%, transparent 70%)`,
            }}
            animate={{
              scale: isHoveringHandle || isDragging ? [1, 1.25, 1] : [1, 1.1, 1],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />

          <div
            className="w-8 h-8 rounded-full flex flex-col items-center justify-center shadow-2xl transition-transform"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #3a3a46 0%, #15151c 100%)',
              border: `2px solid ${vesselColor}`,
              boxShadow: `0 0 16px ${vesselColor}66, 0 4px 12px rgba(0,0,0,0.8)`,
              transform: isHoveringHandle || isDragging ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            <div className="flex gap-[2px] items-center mb-[1px]">
              <div className="w-[1.5px] h-2 bg-white/40 rounded-full" />
              <div className="w-[1.5px] h-2 bg-white/70 rounded-full" />
              <div className="w-[1.5px] h-2 bg-white/40 rounded-full" />
            </div>
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: vesselColor,
                boxShadow: `0 0 6px ${vesselColor}`,
              }}
            />
          </div>

          <div
            className="absolute pointer-events-none whitespace-nowrap px-3 py-1.5 rounded-full backdrop-blur-md border shadow-2xl"
            style={{
              top: safeAngle < -45 ? '135%' : '-135%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10, 10, 14, 0.94)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.85)',
            }}
          >
            <span className="font-sans text-xs font-medium text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: vesselColor }} />
              Drag to Tilt Head
              <span className="text-white/60 tabular-nums font-mono text-[11px]">
                ({safeAngle > 0 ? `+${safeAngle}°` : `${safeAngle}°`})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. DIRECTIONAL GRAVITY VS INFLOW INDICATOR (PLAIN ENGLISH) ── */}
      <div
        className="absolute bottom-1 sm:bottom-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 sm:gap-2 border shadow-lg pointer-events-none z-20 text-[10px] sm:text-xs"
        style={{
          background: 'rgba(12, 12, 16, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {safeAngle < -10 ? (
          <>
            <span className="text-xs text-sky-400 font-bold">↑</span>
            <span className="font-sans text-xs text-sky-300 font-medium">
              Reclined · Extra Blood Flow to Brain
            </span>
          </>
        ) : safeAngle > 20 ? (
          <>
            <span className="text-xs text-amber-400 font-bold">↓</span>
            <span className="font-sans text-xs text-amber-300 font-medium">
              Neck Strain · Looking Down
            </span>
          </>
        ) : (
          <>
            <span className="text-xs text-emerald-400 font-bold">●</span>
            <span className="font-sans text-xs text-emerald-300 font-medium">
              Good Posture · Normal Gravity
            </span>
          </>
        )}
      </div>
    </div>
  );
}
