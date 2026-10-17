'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TemplePillProps {
  finish: string;
  size?: 'full' | 'mini';
  className?: string;
  layoutId?: string;
  actionButton?: React.ReactNode;
  isPressed?: boolean;
  showPedestal?: boolean;
}

export default function TemplePill({
  finish,
  size = 'full',
  className = '',
  actionButton,
  isPressed = false,
  showPedestal = true,
}: TemplePillProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setTilt({
        x: (y - 0.5) * -16,
        y: (x - 0.5) * 16,
      });
      setGlare({ x: x * 100, y: y * 100 });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50 });
  }, []);

  const isMini = size === 'mini';
  const w = isMini ? 140 : 340;
  const h = isMini ? 50 : 116;

  return (
    <div
      data-finish={finish}
      className={`relative flex items-center justify-center bg-transparent rounded-full ${className}`}
      style={{
        width: showPedestal ? w + (isMini ? 0 : 30) : w,
        height: showPedestal ? h + (isMini ? 0 : 40) : h,
      }}
    >
      {/* ── STUDIO PEDESTAL / CHARGING BASE REFLECTION (Only on full size when pedestal enabled) ── */}
      {!isMini && showPedestal && (
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center"
          style={{
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
          }}
        >
          {/* Ambient soft shadow */}
          <div className="w-72 h-8 rounded-full bg-black/80 blur-lg" />

          {/* Diffuse specular floor reflection */}
          <div className="w-64 h-6 rounded-full bg-white/[0.04] blur-md -mt-5" />

          {/* Crisp 1px rim-lit cradle arc */}
          <div
            className="w-56 h-4 rounded-full border-t border-white/20 -mt-3.5"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)',
              boxShadow: '0 -2px 10px rgba(255,255,255,0.08)',
            }}
          />
        </div>
      )}

      {/* ── FLOATING HARDWARE CAPSULE CONTAINER ── */}
      <motion.div
        animate={!isMini && !isPressed ? { y: [0, -5, 0] } : undefined}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10 rounded-full bg-transparent"
        style={{ width: w, height: h }}
      >
        <motion.div
          ref={containerRef}
          className="relative w-full h-full cursor-pointer select-none rounded-full bg-transparent"
          style={{
            perspective: 600,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            animate={{
              rotateX: tilt.x,
              rotateY: tilt.y,
              scale: isPressed ? 0.96 : 1,
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative w-full h-full rounded-full overflow-hidden"
            style={{
              background: `linear-gradient(165deg, 
                rgba(255,255,255,0.12) 0%, 
                var(--metal-base) 25%, 
                var(--metal-highlight) 50%, 
                var(--metal-base) 75%, 
                rgba(0,0,0,0.45) 100%
              )`,
              boxShadow: isPressed
                ? `
                inset 0 1.5px 2px rgba(255,255,255,0.5),
                inset 0 -6px 12px rgba(0,0,0,0.9),
                0 0 35px var(--accent-glow),
                0 16px 36px -8px rgba(0,0,0,0.95),
                0 0 1px rgba(255,255,255,0.2)
              `
                : `
                inset 0 1.5px 2px rgba(255,255,255,0.4),
                inset 0 -6px 12px rgba(0,0,0,0.85),
                0 24px 48px -12px rgba(0,0,0,0.9),
                0 0 1px rgba(255,255,255,0.15)
              `,
            }}
          >
            {/* Anodized brushed-metal grain overlay */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-[0.035]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 1px,
                  rgba(255,255,255,0.5) 1px,
                  rgba(255,255,255,0.5) 2px
                )`,
                backgroundSize: '3px 100%',
              }}
            />

            {/* Specular glare following cursor */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.24) 0%, transparent 50%)`,
              }}
            />

            {/* Slow automatic specular light sweep across metallic face */}
            <motion.div
              className="absolute inset-y-0 w-24 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 50%, transparent)',
                transform: 'skewX(-25deg)',
              }}
              animate={{
                left: ['-80%', '160%'],
              }}
              transition={{
                duration: 4.8,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 1.6,
              }}
            />

            {/* Content area: clean luxury TEMPLE engraving & recessed optical sensor lens OR actionButton */}
            <div className="absolute inset-0 flex items-center justify-between px-[12%] sm:px-[14%]">
              {/* Clean luxury brand engraving */}
              <span
                className="tracking-[0.26em] uppercase text-white/30 shrink-0 select-none"
                style={{
                  fontSize: isMini ? 7 : 11,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600,
                  letterSpacing: '0.26em',
                }}
              >
                TEMPLE
              </span>

              {/* Action Button OR Optical Sensor Window */}
              {actionButton ? (
                actionButton
              ) : (
                <div
                  className="relative shrink-0 flex items-center justify-center"
                  style={{
                    width: isMini ? 20 : 36,
                    height: isMini ? 20 : 36,
                  }}
                >
                {/* Recessed dark glass ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, #0a0a0c 40%, #16161a 70%, transparent 100%)',
                    boxShadow: `
                      inset 0 2px 4px rgba(0,0,0,0.9),
                      inset 0 -1px 2px rgba(255,255,255,0.06),
                      0 0 0 1px rgba(255,255,255,0.05)
                    `,
                  }}
                />

                {/* Dual 850nm NIRS emitter diodes */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: isMini ? 3 : 5,
                    height: isMini ? 3 : 5,
                    left: isMini ? 4 : 7,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--led-color)',
                    boxShadow: `0 0 ${isMini ? 4 : 8}px var(--led-color), 0 0 ${
                      isMini ? 8 : 16
                    }px var(--accent-glow)`,
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: isMini ? 3 : 5,
                    height: isMini ? 3 : 5,
                    right: isMini ? 4 : 7,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--led-color)',
                    boxShadow: `0 0 ${isMini ? 4 : 8}px var(--led-color), 0 0 ${
                      isMini ? 8 : 16
                    }px var(--accent-glow)`,
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.6,
                    delay: 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />

                {/* Center photodiode receiver */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: isMini ? 2 : 4,
                    height: isMini ? 2 : 4,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(255,255,255,0.15)',
                    boxShadow: 'inset 0 0 2px rgba(255,255,255,0.1)',
                  }}
                />
              </div>
            )}
          </div>

            {/* Outer bezel edge highlight */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.12)',
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
