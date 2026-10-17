'use client';

import { useRef, useEffect, useCallback } from 'react';

interface PpgWaveformProps {
  /** 0 = chaotic static, 1 = clean arterial wave */
  lockLevel: number;
  /** Canvas width (CSS px) */
  width?: number;
  /** Canvas height (CSS px) */
  height?: number;
  /** Stroke color (CSS) — defaults to led-color */
  color?: string;
  /** Beats per minute — controls wave spacing/frequency */
  bpm?: number;
  /** BrainFlow value — controls wave amplitude */
  brainFlow?: number;
  /** Entropy value (1–250) — controls sympathetic jitter */
  entropy?: number;
  /** Posture tilt angle (-90 to +90) — controls Y-offset baseline shift */
  postureAngle?: number;
  /** Show diagnostic grid with Y-axis labels */
  showGrid?: boolean;
  /** Show floating HUD badges */
  showBadges?: boolean;
  className?: string;
}

export default function PpgWaveform({
  lockLevel,
  width = 680,
  height = 180,
  color,
  bpm = 68,
  brainFlow = 86,
  entropy = 60,
  postureAngle = 0,
  showGrid = false,
  showBadges = true,
  className = '',
}: PpgWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Store latest props in refs so the draw callback always sees fresh values
  const propsRef = useRef({
    lockLevel,
    bpm,
    brainFlow,
    entropy,
    postureAngle,
    color,
    showGrid,
  });
  propsRef.current = {
    lockLevel,
    bpm,
    brainFlow,
    entropy,
    postureAngle,
    color,
    showGrid,
  };

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      const {
        lockLevel: lock_,
        bpm: bpm_,
        brainFlow: bf_,
        entropy: ent_,
        postureAngle: pa_,
        color: color_,
        showGrid: grid_,
      } = propsRef.current;

      const W = width;
      const H = height;

      ctx.clearRect(
        0,
        0,
        W * (window.devicePixelRatio || 1),
        H * (window.devicePixelRatio || 1)
      );
      ctx.save();

      // Get computed LED color
      const strokeColor =
        color_ ||
        getComputedStyle(document.documentElement)
          .getPropertyValue('--led-color')
          .trim() ||
        '#22d3ee';

      const lock = Math.max(0, Math.min(1, lock_));

      /* ─── PHYSIOLOGICAL PARAMETERS ──────────────────────────── */

      // 1. Frequency (Wave Spacing): MUST scale directly with BPM
      // wavelength = W / (bpm / 18)
      // At 58 BPM (Deep Work): ~3.2 cycles visible (wide, relaxed)
      // At 104 BPM (3rd Espresso): ~5.8 cycles visible (tight, racing)
      const cyclesVisible = Math.max(2, bpm_ / 18);
      const wavelength = W / cyclesVisible;
      const spatialFreq = (2 * Math.PI) / wavelength;
      const waveSpeed = wavelength * (bpm_ / 60);

      // 2. Amplitude (Wave Height): Scale peak height with brainFlow
      // High BrainFlow (e.g. 98 BF in Cold Plunge) -> tall surging peaks
      // Low BrainFlow (e.g. 68 BF in Doomscrolling) -> shallow compressed waves
      const bfNorm = Math.max(0.4, Math.min(1.25, (bf_ - 35) / 55));
      const baseAmp = H * 0.28 * bfNorm;

      // 3. Sympathetic Jitter (Entropy):
      // When entropy > 120 (3rd Espresso / Doomscrolling), inject high-frequency
      // micro-tremor noise into the dicrotic notch
      const jitterActive = ent_ > 100;
      const jitterIntensity = jitterActive
        ? Math.min(1.0, (ent_ - 90) / 110)
        : 0;

      // 4. Hydrostatic Baseline Shift (Posture Tilt):
      // -90° (Inversion) -> blood pools into brain, shift baseline down (+Y in canvas = lower baseline, higher arterial fill)
      // +90° (Standing) -> hydrostatic drainage, shift baseline up (-Y in canvas)
      const baselineShift = (-pa_ / 90) * (H * 0.16);
      const centerY = H * 0.52 + baselineShift;

      /* ─── DIAGNOSTIC GRID ───────────────────────────────────── */

      if (grid_) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        const gridLabels = ['100 ml/min', '75 ml/min', '50 ml/min'];
        const gridYPositions = [H * 0.22, H * 0.52, H * 0.82];

        for (let i = 0; i < gridYPositions.length; i++) {
          const gy = gridYPositions[i];
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();

          // Y-axis labels on the left
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(gridLabels[i], 8, gy - 4);
        }

        // Vertical cardiac cycle partition markers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        for (let c = 0; c <= Math.ceil(cyclesVisible) + 1; c++) {
          const gx = c * wavelength;
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
      }

      /* ─── COMPUTE WAVEFORM PATH ─────────────────────────────── */

      const points: { x: number; y: number }[] = [];

      for (let px = 0; px <= W; px++) {
        const x = px;
        const phase = spatialFreq * x - waveSpeed * t;

        // Anatomic arterial pulse shape:
        // Fundamental + 2nd harmonic (dicrotic notch) + 3rd harmonic (catacrotic slope)
        const fundamental = Math.sin(phase);
        const dicrotic = 0.42 * Math.sin(2 * phase - 0.85);
        const diastolic = 0.16 * Math.sin(3 * phase + 1.25);

        let signal = fundamental + dicrotic + diastolic;

        // Inject high-frequency micro-tremor noise on dicrotic notch when entropy is high
        if (jitterIntensity > 0 && lock > 0.4) {
          // Micro-tremor concentrated around the dicrotic depression and reflection
          const notchWeight = Math.max(0, -Math.sin(2 * phase - 0.85) + 0.3);
          const tremor =
            Math.sin(phase * 8.2 + t * 45) * 0.22 +
            Math.sin(phase * 15.6 + t * 75) * 0.14 +
            (Math.random() - 0.5) * 0.12;

          signal += tremor * jitterIntensity * notchWeight * 1.6;
        }

        // Stochastic noise before optical seal is locked
        const noise = (Math.random() * 2 - 1) * 0.85 * (1 - lock);

        const amplitude = baseAmp * (signal * lock + noise);
        const y = centerY - amplitude;

        points.push({ x, y });
      }

      /* ─── SOFT VERTICAL GRADIENT FILL ───────────────────────── */

      if (lock > 0.25 && points.length > 0) {
        let fillR = 34;
        let fillG = 211;
        let fillB = 238;

        if (strokeColor.startsWith('#')) {
          fillR = parseInt(strokeColor.slice(1, 3), 16) || 34;
          fillG = parseInt(strokeColor.slice(3, 5), 16) || 211;
          fillB = parseInt(strokeColor.slice(5, 7), 16) || 238;
        }

        const areaGrad = ctx.createLinearGradient(0, centerY - baseAmp * 1.2, 0, H);
        areaGrad.addColorStop(0, `rgba(${fillR}, ${fillG}, ${fillB}, ${0.14 * lock})`);
        areaGrad.addColorStop(0.65, `rgba(${fillR}, ${fillG}, ${fillB}, ${0.04 * lock})`);
        areaGrad.addColorStop(1, `rgba(${fillR}, ${fillG}, ${fillB}, 0)`);

        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          if (i === 0) ctx.moveTo(points[i].x, points[i].y);
          else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();
      }

      /* ─── MAIN WAVEFORM STROKE ──────────────────────────────── */

      if (points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = 0.9;
        ctx.lineJoin = 'round';

        for (let i = 0; i < points.length; i++) {
          if (i === 0) ctx.moveTo(points[i].x, points[i].y);
          else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Subtle neon glow pass
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8 * lock;
        ctx.globalAlpha = 0.35 * lock;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        /* ─── LEADING LASER PLAYHEAD DOT ────────────────────────── */
        if (lock > 0.4) {
          const playhead = points[points.length - 1];
          // Core playhead dot
          ctx.beginPath();
          ctx.arc(playhead.x - 2, playhead.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Outer halo ring
          ctx.beginPath();
          ctx.arc(playhead.x - 2, playhead.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.65;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();
    },
    [width, height]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    startTimeRef.current = performance.now();

    const loop = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      draw(ctx, elapsed);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, width, height]);

  const isCalibrated = lockLevel > 0.4;
  const isStressed = entropy >= 100;

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width, height, maxWidth: '100%' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height }}
        className="block"
      />

      {/* ── 2 LIVE FLOATING HUD ANNOTATION BADGES ─────────────────── */}
      {showBadges && isCalibrated && (
        <div className="absolute inset-x-0 top-2 px-3 pointer-events-none flex items-center justify-between gap-2">
          {/* Badge 1: Systolic Peak */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-md transition-all duration-300 shadow-lg"
            style={{
              background: 'rgba(8, 8, 10, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: 'var(--led-color)',
                boxShadow: '0 0 6px var(--led-color)',
              }}
            />
            <span className="font-mono text-[9px] sm:text-[10px] tracking-wide text-white/80 tabular-nums">
              SYSTOLIC PEAK:{' '}
              <span className="font-semibold" style={{ color: 'var(--led-color)' }}>
                {brainFlow.toFixed(1)} BF
              </span>{' '}
              <span className="text-white/40 hidden sm:inline">— Arterial Inflow</span>
            </span>
          </div>

          {/* Badge 2: Dicrotic Notch */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-md transition-all duration-300 shadow-lg"
            style={{
              background: 'rgba(8, 8, 10, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: isStressed ? '#f87171' : '#34d399',
                boxShadow: `0 0 6px ${isStressed ? '#f87171' : '#34d399'}`,
              }}
            />
            <span className="font-mono text-[9px] sm:text-[10px] tracking-wide text-white/80">
              DICROTIC NOTCH:{' '}
              <span
                className="font-semibold"
                style={{ color: isStressed ? '#f87171' : '#34d399' }}
              >
                {isStressed ? 'Constricted / High Stress' : 'Elastic / Relaxed'}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
