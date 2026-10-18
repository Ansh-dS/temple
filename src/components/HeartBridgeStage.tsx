'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Check } from 'lucide-react';
import TemplePill from './TemplePill';
import { templeAudio } from '../lib/sound';

interface HeartBridgeStageProps {
  finish: string;
  onComplete: () => void;
}

export default function HeartBridgeStage({ finish, onComplete }: HeartBridgeStageProps) {
  // Total sync duration before lock: 3.8s; then 0.9s celebratory hold on "Connected"
  const SYNC_DURATION = 3.8;
  const [elapsed, setElapsed] = useState(0);
  const [isFullyConnected, setIsFullyConnected] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const heartbeatsPlayedRef = useRef<{ [key: string]: boolean }>({});
  const chimePlayedRef = useRef(false);
  const completeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    templeAudio.startScanningLoop();

    const loop = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const seconds = (now - startTimeRef.current) / 1000;
      setElapsed(Math.min(SYNC_DURATION, seconds));

      // Cardiac rhythm beats at ~68 BPM (~0.88s intervals)
      const beatTimes = [1.2, 2.1, 3.0];
      beatTimes.forEach((bt, idx) => {
        const key = `beat_${idx}`;
        if (seconds >= bt && !heartbeatsPlayedRef.current[key]) {
          heartbeatsPlayedRef.current[key] = true;
          templeAudio.playLubDub();
        }
      });

      // At 100% (3.8s), trigger Connected celebration and hold for 2.6s so the user clearly perceives connection
      if (seconds >= SYNC_DURATION) {
        setIsFullyConnected(true);
        templeAudio.stopScanningLoop();
        if (!chimePlayedRef.current) {
          chimePlayedRef.current = true;
          templeAudio.playSyncChime();
          completeTimeoutRef.current = setTimeout(() => {
            onCompleteRef.current?.();
          }, 2600);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
      templeAudio.stopScanningLoop();
    };
  }, []);

  const progressRatio = Math.min(1, elapsed / SYNC_DURATION);
  const pulseFound = elapsed >= 1.2;
  const DOT_COUNT = 9;

  return (
    <div className="flex flex-col items-center justify-center gap-7 sm:gap-9 w-full max-w-2xl px-4 py-4 select-none">
      {/* ── 1. TOP HEADLINE (HERO STATUS) ────────────────────────── */}
      <div className="flex flex-col items-center gap-2 text-center h-16 justify-center">
        <AnimatePresence mode="wait">
          {!isFullyConnected ? (
            <motion.h2
              key="reading"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-2xl md:text-4xl font-semibold text-white tracking-tight"
            >
              Reading Heart Rhythm...
            </motion.h2>
          ) : (
            <motion.h2
              key="connected"
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1.05, filter: 'blur(0px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-400 tracking-tight"
              style={{
                textShadow: '0 0 32px rgba(52, 211, 153, 0.65)',
              }}
            >
              Connected
            </motion.h2>
          )}
        </AnimatePresence>
        <p className="text-xs sm:text-sm font-normal text-white/50">
          {!isFullyConnected
            ? 'Aligning optical arterial pulse'
            : 'Biometric telemetry synchronized'}
        </p>
      </div>

      {/* ── 2. CENTER STACK (PIVOTS VERTICAL ON MOBILE, HORIZONTAL ON MD+) ── */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full py-2">
        {/* Left / Top: Temple Hardware Pill Card */}
        <div
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl glass transition-all"
          style={{
            minWidth: 120,
            borderColor: isFullyConnected
              ? 'rgba(52, 211, 153, 0.4)'
              : 'var(--ui-border)',
            boxShadow: isFullyConnected
              ? '0 0 24px rgba(52, 211, 153, 0.15)'
              : '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <TemplePill finish={finish} size="mini" />
          <span className="text-xs font-medium text-white/90 mt-2.5">
            Temple
          </span>
        </div>

        {/* Middle: Smooth Flowing Signal Dots (Top-to-Bottom on Mobile, Left-to-Right on Desktop) */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-2">
          {Array.from({ length: DOT_COUNT }).map((_, i) => {
            const dotProgress = (i + 1) / DOT_COUNT;
            const isFilled = progressRatio >= dotProgress;
            // Running wave shine
            const wave = (elapsed * 3.5) % DOT_COUNT;
            const isWaving = Math.abs(wave - i) < 1.2;

            return (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full transition-all duration-150"
                style={{
                  background: isFullyConnected
                    ? '#34d399'
                    : isFilled || isWaving
                    ? 'var(--led-color)'
                    : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: isFullyConnected
                    ? '0 0 8px rgba(52, 211, 153, 0.8)'
                    : isFilled || isWaving
                    ? '0 0 8px var(--accent-glow)'
                    : 'none',
                  transform: isWaving ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>

        {/* Right / Bottom: Heart Rate Card with Pulsing Heart */}
        <div
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl glass transition-all"
          style={{
            minWidth: 120,
            borderColor: isFullyConnected
              ? 'rgba(52, 211, 153, 0.4)'
              : 'var(--ui-border)',
            boxShadow: isFullyConnected
              ? '0 0 24px rgba(52, 211, 153, 0.2)'
              : '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <motion.div
            animate={{
              scale: pulseFound ? [1, 1.2, 0.95, 1.15, 1] : [1, 1.05, 1],
            }}
            transition={{
              duration: 0.88,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Heart
              size={24}
              className="transition-colors duration-300"
              style={{
                color: isFullyConnected
                  ? '#34d399'
                  : pulseFound
                  ? '#fb7185'
                  : 'rgba(255, 255, 255, 0.3)',
                fill: pulseFound ? '#fb7185' : 'transparent',
                filter: pulseFound
                  ? 'drop-shadow(0 0 8px rgba(251, 113, 133, 0.6))'
                  : 'none',
              }}
            />
          </motion.div>

          <div className="flex items-baseline gap-1 mt-1.5">
            <span
              className="text-lg sm:text-xl font-bold font-mono tabular-nums"
              style={{
                color: isFullyConnected
                  ? '#34d399'
                  : pulseFound
                  ? '#ffffff'
                  : 'rgba(255, 255, 255, 0.4)',
              }}
            >
              {pulseFound ? '68' : '--'}
            </span>
            <span className="text-[10px] text-white/50 font-medium">BPM</span>
          </div>

          <span className="text-[11px] font-medium text-white/70 mt-0.5">
            Heart Rate
          </span>
        </div>
      </div>

      {/* ── 3. BOTTOM STEP INDICATOR (COMPACT ON MOBILE) ──────────── */}
      <div className="flex items-center gap-1.5 sm:gap-4 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/5 text-[10px] md:text-xs flex-wrap justify-center">
        {/* Step 1: Sensor Placed */}
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Check size={12} className="text-emerald-400" />
          <span>Sensor Placed</span>
        </div>

        <span className="text-white/20 select-none hidden sm:inline">───</span>
        <span className="text-white/20 select-none sm:hidden">·</span>

        {/* Step 2: Pulse Found */}
        <div
          className="flex items-center gap-1.5 font-medium transition-colors"
          style={{
            color: pulseFound ? '#34d399' : 'rgba(255, 255, 255, 0.35)',
          }}
        >
          {pulseFound ? (
            <Check size={12} className="text-emerald-400" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          )}
          <span>Pulse Found</span>
        </div>

        <span className="text-white/20 select-none hidden sm:inline">───</span>
        <span className="text-white/20 select-none sm:hidden">·</span>

        {/* Step 3: Connected */}
        <div
          className="flex items-center gap-1.5 font-medium transition-colors"
          style={{
            color: isFullyConnected ? '#34d399' : 'rgba(255, 255, 255, 0.35)',
          }}
        >
          {isFullyConnected ? (
            <Check size={12} className="text-emerald-400" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          )}
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
}
