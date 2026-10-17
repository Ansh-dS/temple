'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Heart,
  Check,
  Compass,
  Zap,
} from 'lucide-react';
import TemplePill from '@/src/components/TemplePill';
import HeartBridgeStage from '@/src/components/HeartBridgeStage';
import BiometricBust, { type AutoState } from '@/src/components/BiometricBust';
import { templeAudio } from '@/src/lib/sound';

/* ─── TYPES ────────────────────────────────────────────────────────── */

type PairingStage = 'discover' | 'seal' | 'calibrate' | 'live';

type Finish =
  | 'black-mirror'
  | 'true-gold'
  | 'real-jade'
  | 'rose-gold'
  | 'deep-blue'
  | 'purple-funk';

interface FinishOption {
  id: Finish;
  label: string;
  conicGradient: string;
  highlightBorder: string;
  glow: string;
}

interface StateDiagnosis {
  state: AutoState;
  title: string;
  diagnosis: string;
  color: string;
  theme: 'calm' | 'stressed';
  flowStatus: string;
}

/* ─── CONSTANTS ────────────────────────────────────────────────────── */

const FINISHES: FinishOption[] = [
  {
    id: 'black-mirror',
    label: 'Black Mirror',
    conicGradient: 'conic-gradient(from 140deg, #131316, #3b3b44, #121215, #555562, #131316)',
    highlightBorder: 'rgba(255, 255, 255, 0.45)',
    glow: 'rgba(226, 232, 240, 0.3)',
  },
  {
    id: 'true-gold',
    label: 'True Gold',
    conicGradient: 'conic-gradient(from 140deg, #784e12, #fde047, #926017, #fef08a, #784e12)',
    highlightBorder: 'rgba(253, 224, 71, 0.65)',
    glow: 'rgba(234, 179, 8, 0.4)',
  },
  {
    id: 'real-jade',
    label: 'Real Jade',
    conicGradient: 'conic-gradient(from 140deg, #063c2c, #34d399, #095c43, #6ee7b7, #063c2c)',
    highlightBorder: 'rgba(52, 211, 153, 0.65)',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'rose-gold',
    label: 'Rose Gold',
    conicGradient: 'conic-gradient(from 140deg, #5c1e2e, #fb7185, #7d2940, #fecdd3, #5c1e2e)',
    highlightBorder: 'rgba(251, 113, 133, 0.65)',
    glow: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'deep-blue',
    label: 'Deep Blue',
    conicGradient: 'conic-gradient(from 140deg, #08243d, #22d3ee, #0e3b62, #7dd3fc, #08243d)',
    highlightBorder: 'rgba(34, 211, 238, 0.65)',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'purple-funk',
    label: 'Purple Funk',
    conicGradient: 'conic-gradient(from 140deg, #300e4e, #c084fc, #481774, #e9d5ff, #300e4e)',
    highlightBorder: 'rgba(192, 132, 252, 0.65)',
    glow: 'rgba(168, 85, 247, 0.45)',
  },
];

const STATUS_LABELS: Record<PairingStage, string> = {
  discover: 'Pairing',
  seal: 'Contact',
  calibrate: 'Connecting',
  live: 'Live',
};

/* ─── MAIN COMPONENT ───────────────────────────────────────────────── */

export default function TemplePrototype() {
  // State machine
  const [stage, setStage] = useState<PairingStage>('discover');
  const [finish, setFinish] = useState<Finish>('real-jade');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showFieldNotes, setShowFieldNotes] = useState(false);

  // Stage 2: Seal
  const [holdProgress, setHoldProgress] = useState(0);
  const [isSecured, setIsSecured] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSealHolding = useRef(false);
  const sealRafRef = useRef<number | null>(null);
  const sealTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stage 4: Live Biomechanical State Inputs
  const [postureAngle, setPostureAngle] = useState(0); // -90° (inversion) to +90° (slouching)
  const [agitationLevel, setAgitationLevel] = useState(0); // 0 to 100 (universal agitation / physical exertion)

  /* ─── STAGE 4 AGITATION SENSORS (EXERTION & SHAKE ONLY) ── */

  useEffect(() => {
    if (stage !== 'live') return;

    let rafId: number;
    let lastTime = performance.now();
    let lastAccel: { x: number; y: number; z: number } | null = null;

    // Mobile Device Accelerometer (DeviceMotionEvent) — optional device shake
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      if (lastAccel) {
        const dx = Math.abs(acc.x - lastAccel.x);
        const dy = Math.abs(acc.y - lastAccel.y);
        const dz = Math.abs(acc.z - lastAccel.z);
        const deltaForce = dx + dy + dz;

        // Phone shake threshold (normal walking/holding is ~1.5 - 3, vigorous shake is > 7)
        if (deltaForce > 7.0) {
          const shakeSpike = Math.min(50, (deltaForce - 7.0) * 4.0);
          setAgitationLevel((prev) => Math.min(100, prev + shakeSpike));
        }
      }

      lastAccel = { x: acc.x, y: acc.y, z: acc.z };
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    // Smooth continuous decay back to Calm (0) over 3.5 seconds
    const decayLoop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setAgitationLevel((prev) => {
        if (prev <= 0) return 0;
        const decayRate = 100 / 3.5; // reaches 0 in 3.5s
        return Math.max(0, prev - decayRate * delta);
      });

      rafId = requestAnimationFrame(decayLoop);
    };

    rafId = requestAnimationFrame(decayLoop);

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
      cancelAnimationFrame(rafId);
    };
  }, [stage]);

  const triggerExertion = useCallback(() => {
    templeAudio.init();
    templeAudio.playTick(340);
    setAgitationLevel((prev) => Math.min(100, prev + 18));
  }, []);

  /* ─── REAL-TIME BIOMECHANICAL DEDUCTION ENGINE ──────────────────── */

  // 1. Cervical Spine Load (lbs):
  // 12 lbs neutral up to 60 lbs forward slump
  const cervicalLoadLbs =
    postureAngle <= 0
      ? 12
      : 12 + Math.min(48, (postureAngle / 60) * 48);

  // 2. BrainFlow (BF):
  // Base at 0° = 88.0 BF.
  // Inversion assist (angle < -10°): rushes up to 99.4 BF.
  // Forward slump (angle > 15°): drops to 58.0 BF.
  // Agitation penalty: vasoconstriction penalty (-agitationLevel * 0.12).
  const baseBf = 88.0;
  const inversionAssistBf =
    postureAngle < -10 ? (Math.abs(postureAngle) - 10) * 0.142 : 0;
  const slumpDrainBf =
    postureAngle > 15 ? (postureAngle - 15) * 0.40 : 0;
  const agitationVasoconstriction = agitationLevel * 0.12;

  const liveBf = Math.min(
    99.4,
    Math.max(54.0, baseBf + inversionAssistBf - slumpDrainBf - agitationVasoconstriction)
  );

  // 3. Entropy (1 - 250):
  // Base = 32.
  const slumpEntropy = postureAngle > 15 ? (postureAngle - 15) * 1.15 : 0;
  const inversionCalmEntropy =
    postureAngle < -15 && agitationLevel < 25
      ? -Math.min(10, (-postureAngle - 15) * 0.18)
      : 0;
  const agitationEntropy = agitationLevel * 1.45;

  const liveEntropy = Math.min(
    240,
    Math.max(20, Math.round(32 + slumpEntropy + inversionCalmEntropy + agitationEntropy))
  );

  // 4. BPM (Cardiac Rhythm):
  // Base = 58 BPM.
  const slumpBpm = postureAngle > 20 ? (postureAngle - 20) * 0.25 : 0;
  const inversionBpm = postureAngle < -15 ? -6 : 0;
  const agitationBpm = (agitationLevel / 100) * 52;

  const liveBpm = Math.min(
    114,
    Math.max(52, Math.round(58 + slumpBpm + inversionBpm + agitationBpm))
  );

  // 5. Automatic State Classification (Luxury Consumer Human Language):
  let stateInfo: StateDiagnosis;

  if (agitationLevel > 45 || liveEntropy > 135) {
    stateInfo = {
      state: 'SYMPATHETIC OVERDRIVE',
      title: 'High Tension',
      diagnosis: 'Elevated motor restlessness and physical tension detected',
      color: '#ef4444',
      theme: 'stressed',
      flowStatus: 'Constricted Flow',
    };
  } else if (postureAngle > 22) {
    stateInfo = {
      state: 'CERVICAL STRAIN // FATIGUE',
      title: 'Neck Strain',
      diagnosis: 'Looking down compresses neck vessels and reduces brain blood flow',
      color: '#f97316',
      theme: 'stressed',
      flowStatus: 'Restricted Flow',
    };
  } else if (postureAngle < -15) {
    stateInfo = {
      state: 'GRAVITY INVERSION // HYPER-PERFUSION',
      title: 'Reclined Surge',
      diagnosis: 'Reclined posture harnesses gravity to flood your cortex with oxygen',
      color: '#38bdf8',
      theme: 'calm',
      flowStatus: 'Boosted Inflow',
    };
  } else {
    stateInfo = {
      state: 'COHERENT FLOW // OPTIMAL EASE',
      title: 'Calm & Focused',
      diagnosis: 'Balanced posture with steady blood flow and low physical strain',
      color: '#34d399',
      theme: 'calm',
      flowStatus: 'Optimal Flow',
    };
  }

  /* ─── THEME DATA ATTRIBUTES ────────────────────────────────────── */

  useEffect(() => {
    document.documentElement.setAttribute('data-finish', finish);
  }, [finish]);

  useEffect(() => {
    if (stage === 'live') {
      document.documentElement.setAttribute('data-entropy', stateInfo.theme);
    } else {
      document.documentElement.removeAttribute('data-entropy');
    }
  }, [stage, stateInfo.theme]);

  /* ─── STAGE 2: SEAL LOGIC (1.8s HOLD) ───────────────────────────── */

  const startSealHold = useCallback(() => {
    if (stage !== 'seal' || isSecured) return;
    isSealHolding.current = true;
    setIsHolding(true);
    templeAudio.startSealHum();
  }, [stage, isSecured]);

  const stopSealHold = useCallback(() => {
    if (stage !== 'seal') return;
    isSealHolding.current = false;
    setIsHolding(false);
    templeAudio.stopSealHum();
  }, [stage]);

  useEffect(() => {
    if (stage !== 'seal') return;

    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isSealHolding.current && !isSecured) {
        setHoldProgress((prev) => {
          // 0% -> 100% in exactly 1.8 seconds
          const next = Math.min(100, prev + (100 / 1.8) * delta);

          if (next >= 100 && prev < 100) {
            setIsSecured(true);
            setIsHolding(false);
            isSealHolding.current = false;
            templeAudio.stopSealHum();
            templeAudio.playLockClick();
            // Exactly 800ms "bask in success" delay before transitioning to calibrate
            sealTransitionTimeoutRef.current = setTimeout(() => {
              setStage('calibrate');
              setIsSecured(false);
            }, 1600);
          }
          return next;
        });
      } else if (!isSecured) {
        setHoldProgress((prev) => {
          if (prev >= 100) return 100;
          return Math.max(0, prev - (100 / 0.8) * delta);
        });
      }

      sealRafRef.current = requestAnimationFrame(tick);
    };

    sealRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (sealRafRef.current) cancelAnimationFrame(sealRafRef.current);
      if (sealTransitionTimeoutRef.current) clearTimeout(sealTransitionTimeoutRef.current);
    };
  }, [stage, isSecured]);

  // Spacebar hold handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (stage === 'seal') startSealHold();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        if (stage === 'seal') stopSealHold();
      }
    };
    const handleBlur = () => {
      setIsSpacePressed(false);
      if (stage === 'seal') stopSealHold();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [stage, startSealHold, stopSealHold]);

  /* ─── RESET ────────────────────────────────────────────────────── */

  const replay = useCallback(() => {
    if (sealTransitionTimeoutRef.current) clearTimeout(sealTransitionTimeoutRef.current);
    templeAudio.stopSealHum();
    templeAudio.stopScanningLoop();
    setStage('discover');
    setHoldProgress(0);
    setIsSecured(false);
    setIsHolding(false);
    setIsSpacePressed(false);
    setPostureAngle(0);
    setAgitationLevel(0);
    document.documentElement.removeAttribute('data-entropy');
  }, []);

  /* ─── RENDER ───────────────────────────────────────────────────── */

  return (
    <main
      className="h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-8 select-none"
      style={{
        backgroundColor: '#08080A',
        backgroundImage:
          'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* ── LUXURY HEADER ─────────────────────────────────────────── */}
      <header
        className="relative z-20 flex items-center justify-between px-3 sm:px-6 shrink-0 backdrop-blur-md w-full max-w-6xl rounded-2xl border border-white/10 mb-auto"
        style={{ height: 56 }}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: stateInfo.color,
              boxShadow: `0 0 8px ${stateInfo.color}`,
            }}
          />
          <span className="font-sans font-semibold text-xs tracking-wider uppercase text-white/90">
            Temple <span className="text-white/40 font-normal">GEN-02</span>
          </span>
        </div>

        {/* Center: Stage Status Pill (Centering anchored to true viewport/header center) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 rounded-full border pointer-events-none"
          style={{
            background: 'rgba(255, 255, 255, 0.035)',
            borderColor: 'var(--ui-border)',
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: stateInfo.color }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span
            className="font-sans text-xs font-medium tracking-wide"
            style={{ color: stateInfo.color }}
          >
            {STATUS_LABELS[stage]}
          </span>
        </div>

        {/* Right: Utility Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderBtn onClick={() => setShowFieldNotes(true)} title="Field Notes">
            <HelpCircle size={14} />
            <span className="hidden sm:inline">About</span>
          </HeaderBtn>

          <HeaderBtn
            onClick={() => {
              const newState = templeAudio.toggle();
              setAudioEnabled(newState);
            }}
            title="Toggle Audio"
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">
              Sound: {audioEnabled ? 'On' : 'Off'}
            </span>
          </HeaderBtn>

          <HeaderBtn onClick={replay} title="Replay Sequence">
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Restart</span>
          </HeaderBtn>
        </div>
      </header>

      {/* ── CENTER STAGE ─────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-1 sm:px-4 py-1 min-h-0 overflow-hidden my-auto">
        <AnimatePresence mode="wait">
          {stage === 'discover' && (
            <StageWrapper key="discover">
              <DiscoverStage finish={finish} />
            </StageWrapper>
          )}

          {stage === 'seal' && (
            <StageWrapper key="seal">
              <SealStage
                holdProgress={holdProgress}
                isHolding={isHolding}
                isSecured={isSecured}
                isSpacePressed={isSpacePressed}
                finish={finish}
                onStartHold={startSealHold}
                onStopHold={stopSealHold}
              />
            </StageWrapper>
          )}

          {stage === 'calibrate' && (
            <StageWrapper key="calibrate">
              <HeartBridgeStage
                finish={finish}
                onComplete={() => setStage('live')}
              />
            </StageWrapper>
          )}

          {stage === 'live' && (
            <StageWrapper key="live">
              <LiveStage
                stateInfo={stateInfo}
                liveBf={liveBf}
                liveEntropy={liveEntropy}
                liveBpm={liveBpm}
                postureAngle={postureAngle}
                setPostureAngle={setPostureAngle}
                cervicalLoadLbs={cervicalLoadLbs}
                agitationLevel={agitationLevel}
                finish={finish}
                onTriggerExertion={triggerExertion}
              />
            </StageWrapper>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM DOCK (Only in Discover Stage) ── */}
      {stage === 'discover' && (
        <div className="relative z-20 flex justify-center w-full mt-auto shrink-0">
          <AnimatePresence mode="wait">
            <DockWrapper key="dock-discover">
              <DiscoverDock
                finish={finish}
                setFinish={(f) => {
                  templeAudio.init();
                  setFinish(f);
                  templeAudio.playTick(240);
                }}
                onInitialize={() => {
                  templeAudio.init();
                  templeAudio.playTick(280);
                  setStage('seal');
                }}
              />
            </DockWrapper>
          </AnimatePresence>
        </div>
      )}

      {/* ── ABOUT / FIELD NOTES MODAL ────────────────────────────── */}
      <AnimatePresence>
        {showFieldNotes && (
          <FieldNotesModal onClose={() => setShowFieldNotes(false)} />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STAGE TRANSITION WRAPPERS
   ═══════════════════════════════════════════════════════════════════════ */

function StageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center w-full my-auto"
    >
      {children}
    </motion.div>
  );
}

function DockWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="w-full flex justify-center"
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STAGE 1: DISCOVER (DEVICE DETECTED & FINISH PICKER)
   ═══════════════════════════════════════════════════════════════════════ */

function DiscoverStage({ finish }: { finish: Finish }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 my-auto">
      {/* Product Pedestal with Temple Capsule */}
      <div
        className="relative flex items-center justify-center transform scale-75 md:scale-100 transition-transform origin-center"
        style={{ width: 360, height: 260 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`absolute inset-0 rounded-full border pointer-events-none ${
              i === 0
                ? 'animate-radar-ping'
                : i === 1
                  ? 'animate-radar-ping-delayed'
                  : 'animate-radar-ping-delayed-2'
            }`}
            style={{
              borderColor: 'var(--accent-glow)',
            }}
          />
        ))}
        <TemplePill finish={finish} size="full" />
      </div>

      {/* Clean Human-Friendly Copy */}
      <div className="flex flex-col items-center text-center max-w-md px-2">
        <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
          Device Detected
        </h2>
        <p className="text-xs md:text-sm font-normal text-white/50 mt-1">
          Choose your finish to connect
        </p>
      </div>
    </div>
  );
}

function DiscoverDock({
  finish,
  setFinish,
  onInitialize,
}: {
  finish: Finish;
  setFinish: (f: Finish) => void;
  onInitialize: () => void;
}) {
  const activeAlloy = FINISHES.find((f) => f.id === finish);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-[700px] p-4 md:pl-6 md:pr-3 md:py-3 bg-[#121215] rounded-3xl md:rounded-full gap-4 md:gap-0 border border-white/5 shadow-2xl select-none">
      {/* ── LEFT GROUP (SELECTION: FINISH NAME + SWATCHES) ── */}
      <div className="flex flex-row flex-wrap justify-center items-center gap-4">
        <span className="text-xs sm:text-sm font-medium text-white/90 shrink-0">
          {activeAlloy?.label}
        </span>

        <div className="flex flex-row gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-2 px-1.5 items-center bg-transparent">
          {FINISHES.map((f) => {
            const isSelected = finish === f.id;
            return (
              <button
                key={f.id}
                onClick={() => {
                  templeAudio.init();
                  setFinish(f.id);
                }}
                className={`relative rounded-full cursor-pointer transition-all duration-300 ease-out shrink-0 bg-transparent ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-offset-[#121215] ring-[var(--led-color)] shadow-[0_0_12px_var(--accent-glow)] scale-110 opacity-100 z-10'
                    : 'scale-95 opacity-60 hover:opacity-100 hover:scale-100'
                }`}
                style={{
                  width: 32,
                  height: 32,
                  background: f.conicGradient,
                  border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isSelected
                    ? undefined
                    : 'inset 0 1.5px 2px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.4)',
                }}
                title={f.label}
              >
                <div
                  className="absolute inset-0 rounded-full pointer-events-none bg-transparent"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7) 0%, transparent 50%)',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT GROUP (ACTION: CONNECT BUTTON) ── */}
      <button
        onClick={() => {
          templeAudio.init();
          onInitialize();
        }}
        className="w-full md:w-auto px-8 py-3 rounded-full font-medium text-sm text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer shrink-0 flex items-center justify-center"
        style={{
          background: '#ffffff',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.35)',
        }}
      >
        Connect
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STAGE 2: SEAL (ON-DEVICE HIGHLIGHTED TACTILE BUTTON & UNIFIED HIERARCHY)
   ═══════════════════════════════════════════════════════════════════════ */

function SealStage({
  holdProgress,
  isHolding,
  isSecured,
  isSpacePressed,
  finish,
  onStartHold,
  onStopHold,
}: {
  holdProgress: number;
  isHolding: boolean;
  isSecured: boolean;
  isSpacePressed: boolean;
  finish: Finish;
  onStartHold: () => void;
  onStopHold: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 sm:gap-7 w-full max-w-xl px-2 py-2 select-none my-auto">
      {/* ── TIER 1 & 2: TOP HEADER GROUP ── */}
      <div className="flex flex-col items-center text-center">
        <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-white">
          Press &amp; Hold Sensor
        </h2>
        <p className="text-sm md:text-base text-white/55 mt-1.5 sm:mt-2 max-w-md">
          Hold the highlighted button on Temple to establish contact
        </p>
      </div>

      {/* ── TIER 2: CENTER HARDWARE STAGE (PRIMARY FOCAL POINT) ── */}
      <div className="relative flex flex-col items-center gap-3 sm:gap-4 transform scale-[0.82] sm:scale-90 md:scale-100 transition-transform origin-center">
        {/* Physical Capsule with Tight Stadium Progress Ring & Organic Heartbeat Pulse */}
        <motion.div
          className="relative flex items-center justify-center rounded-full bg-transparent"
          style={{
            width: 340,
            height: 116,
          }}
          animate={
            isSecured
              ? {
                  scale: [1, 1.03, 1],
                }
              : isHolding
              ? { scale: 0.96 }
              : { scale: 1.0 }
          }
          transition={
            isSecured
              ? {
                  duration: 1.0,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : { duration: 0.15 }
          }
          onPointerDown={onStartHold}
          onPointerUp={onStopHold}
          onPointerLeave={onStopHold}
        >
          {/* Tight Stadium Progress Ring SVG (overflow-visible to prevent rectangular clipping) */}
          <svg
            className="absolute -inset-[6px] pointer-events-none overflow-visible"
            style={{
              width: 352,
              height: 128,
              zIndex: 20,
              overflow: 'visible',
            }}
            viewBox="0 0 352 128"
          >
            {/* Inactive Track */}
            <rect
              x="6"
              y="6"
              width="340"
              height="116"
              rx="58"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="2"
            />

            {/* Active Stadium Progress Stroke (Continuous organic heartbeat pulse on secured) */}
            <motion.rect
              x="6"
              y="6"
              width="340"
              height="116"
              rx="58"
              pathLength="100"
              fill="none"
              stroke="var(--led-color)"
              strokeWidth={isSecured ? 8 : isHolding ? 4 : 3}
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={isSecured ? 0 : 100 - holdProgress}
              animate={
                isSecured
                  ? {
                      opacity: [0.85, 1, 0.85],
                      strokeWidth: [7.5, 9, 7.5],
                      filter: [
                        'drop-shadow(0 0 18px var(--accent-glow)) drop-shadow(0 0 8px var(--led-color))',
                        'drop-shadow(0 0 34px var(--accent-glow)) drop-shadow(0 0 16px var(--led-color))',
                        'drop-shadow(0 0 18px var(--accent-glow)) drop-shadow(0 0 8px var(--led-color))',
                      ],
                    }
                  : {
                      opacity: 1,
                      strokeWidth: isHolding ? 4 : 3,
                      filter: isHolding
                        ? 'drop-shadow(0 0 16px var(--accent-glow)) drop-shadow(0 0 6px var(--led-color))'
                        : 'drop-shadow(0 0 6px var(--accent-glow))',
                    }
              }
              transition={
                isSecured
                  ? {
                      duration: 1.0,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : { duration: 0.15 }
              }
            />
          </svg>

          {/* Full Heroic Temple Capsule with On-Device Tactile Button */}
          <TemplePill
            finish={finish}
            size="full"
            showPedestal={false}
            isPressed={isHolding}
            actionButton={
              <motion.div
                role="button"
                tabIndex={0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onStartHold();
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onStopHold();
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  onStopHold();
                }}
                whileHover={!isSecured ? { scale: 1.05 } : undefined}
                whileTap={!isSecured ? { scale: 0.94 } : undefined}
                animate={
                  isSecured
                    ? {
                        scale: [1, 1.04, 1],
                        boxShadow: [
                          '0 0 24px var(--accent-glow), inset 0 1px 1px rgba(255,255,255,0.9)',
                          '0 0 38px var(--accent-glow), inset 0 1px 1px rgba(255,255,255,0.9)',
                          '0 0 24px var(--accent-glow), inset 0 1px 1px rgba(255,255,255,0.9)',
                        ],
                      }
                    : isHolding
                    ? {
                        scale: 0.94,
                        boxShadow:
                          '0 0 32px var(--accent-glow), inset 0 1px 1px rgba(255,255,255,0.9)',
                      }
                    : {
                        scale: 1,
                        boxShadow:
                          '0 0 28px var(--accent-glow), inset 0 1px 1px rgba(255,255,255,0.8)',
                      }
                }
                transition={
                  isSecured
                    ? {
                        duration: 1.0,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                    : { duration: 0.15 }
                }
                className="relative flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full cursor-pointer select-none font-semibold text-xs sm:text-sm text-zinc-950 transition-all z-30 min-w-[80px] min-h-[44px]"
                style={{
                  background: 'var(--led-color)',
                }}
              >
                {/* Idle Affordance Pulsing Ring */}
                {!isHolding && !isSecured && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-30 pointer-events-none"
                    style={{ background: 'var(--led-color)' }}
                  />
                )}

                {!isSecured ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-zinc-950 shrink-0" />
                    <span
                      className={
                        isHolding ? 'font-mono tabular-nums font-bold' : 'font-semibold'
                      }
                    >
                      {isHolding ? `${Math.round(holdProgress)}%` : 'Hold'}
                    </span>
                  </>
                ) : (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check size={14} className="stroke-[3]" />
                    <span className="font-bold tracking-tight">Secured</span>
                  </motion.div>
                )}
              </motion.div>
            }
          />
        </motion.div>

        {/* Status text: [ 100% · Sensor Secured ] */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isSecured ? (
              <motion.span
                key="secured"
                initial={{ opacity: 0, scale: 0.92, y: 3 }}
                animate={{ opacity: 1, scale: 1.05, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="text-xs sm:text-sm font-bold tracking-wider font-mono uppercase"
                style={{
                  color: 'var(--led-color)',
                  textShadow: '0 0 16px var(--accent-glow), 0 0 6px var(--led-color)',
                }}
              >
                100% · Sensor Secured
              </motion.span>
            ) : isHolding ? (
              <motion.span
                key="holding"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="text-xs sm:text-sm font-medium tracking-wide text-white/90 font-mono tabular-nums"
              >
                {Math.round(holdProgress)}% · Sealing
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="text-xs sm:text-sm font-normal text-white/40"
              >
                Ready to calibrate contact
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── TIER 3: BOTTOM KEYBOARD HELPER (Hidden on Mobile & Hidden on Secured) ── */}
      <div className="h-7 hidden md:flex items-center justify-center mt-1">
        <AnimatePresence>
          {!isSecured && (
            <motion.div
              key="kbd-helper"
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
              className="hidden md:flex items-center justify-center text-xs sm:text-sm text-white/45 select-none transition-all"
            >
              <span>Or hold</span>
              <kbd
                className={`px-2.5 py-1 mx-1.5 text-xs font-mono font-medium rounded-md border shadow-inner transition-all duration-150 ${
                  isSpacePressed
                    ? 'translate-y-0.5 bg-[var(--led-color)] text-zinc-950 font-bold border-transparent shadow-[0_0_12px_var(--accent-glow)]'
                    : 'text-white/80 bg-white/[0.08] border-white/15'
                }`}
              >
                Spacebar
              </kbd>
              <span>on your keyboard</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STAGE 4: LIVE (LUXURY HEALTH METRICS & VISUAL HIERARCHY)
   ═══════════════════════════════════════════════════════════════════════ */

function LiveStage({
  stateInfo,
  liveBf,
  liveEntropy,
  liveBpm,
  postureAngle,
  setPostureAngle,
  cervicalLoadLbs,
  agitationLevel,
  finish,
  onTriggerExertion,
}: {
  stateInfo: StateDiagnosis;
  liveBf: number;
  liveEntropy: number;
  liveBpm: number;
  postureAngle: number;
  setPostureAngle: (angle: number) => void;
  cervicalLoadLbs: number;
  agitationLevel: number;
  finish: string;
  onTriggerExertion: () => void;
}) {
  const [isPulsing, setIsPulsing] = useState(false);

  const handleTrigger = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onTriggerExertion();
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 220);
  };

  // Flow State (Optimal, Restricted, or Surging)
  const flowState =
    postureAngle < -10
      ? { label: 'Surging', color: '#38bdf8' }
      : postureAngle > 20
      ? { label: 'Restricted', color: '#f97316' }
      : { label: 'Optimal', color: '#34d399' };

  // Explanation copy
  const flowExplanation =
    postureAngle < -10
      ? 'Boosted blood flow from reclining'
      : postureAngle > 20
      ? 'Reduced flow — lift your head up'
      : 'Healthy oxygen flow to your brain';

  // Stress Level status (Calm, Elevated, or High Stress)
  const stressStatus =
    liveEntropy > 130
      ? { label: 'High Stress', color: '#ef4444' }
      : liveEntropy > 70
      ? { label: 'Elevated', color: '#f97316' }
      : { label: 'Calm', color: '#34d399' };

  const stressExplanation =
    liveEntropy > 110 || agitationLevel > 35
      ? 'High physical tension detected'
      : 'Your body is relaxed and burning low energy';

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center w-full h-full gap-4 lg:gap-8 max-w-6xl px-2 sm:px-4 py-2 select-none my-auto">
      {/* ── CENTER STAGE: ROTATABLE BIOMETRIC BUST (Top on Mobile, Center on Desktop) ── */}
      <div className="order-1 lg:order-2 flex flex-col items-center justify-center shrink-0 h-[40vh] min-h-[250px] lg:h-[500px] w-full max-w-[300px] lg:max-w-[400px]">
        <BiometricBust
          finish={finish}
          angle={postureAngle}
          onAngleChange={setPostureAngle}
          detectedState={stateInfo.state}
          brainFlow={liveBf}
          entropy={liveEntropy}
          bpm={liveBpm}
          agitationLevel={agitationLevel}
          cervicalLoadLbs={cervicalLoadLbs}
        />
      </div>

      {/* ── TELEMETRY CARDS WRAPPER: Grid on Mobile below bust, Inlined on Desktop ── */}
      <div className="order-2 lg:contents grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-lg lg:max-w-none">
        {/* ── LEFT CARD: BRAIN BLOOD FLOW ── */}
        <div
          className="lg:order-1 w-full lg:w-[340px] p-3.5 sm:p-5 lg:p-6 rounded-2xl glass shadow-2xl flex flex-col justify-between shrink-0 transition-all border border-white/10 bg-white/[0.025]"
        >
          <div>
            {/* Layer 1 (Header) */}
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 block font-sans truncate">
              BRAIN BLOOD FLOW
            </span>

            {/* Layer 2 (Hero Row: Hero Number + Tiny Badge) */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between w-full mt-1.5 sm:mt-2 mb-1 gap-1 sm:gap-2">
              <span className="text-3xl md:text-4xl lg:text-5xl font-mono font-bold text-white tabular-nums tracking-tight">
                {Math.round(liveBf)}%
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider shrink-0 self-start sm:self-auto"
                style={{
                  color: flowState.color,
                  backgroundColor: `${flowState.color}18`,
                  border: `1px solid ${flowState.color}40`,
                }}
              >
                {flowState.label}
              </span>
            </div>

            {/* Layer 3 (Heart Rate / Sub-metric: Gravity Vector) */}
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/80">
              <Compass size={13} className="text-sky-400 shrink-0" />
              <span className="text-white/60 text-[11px] sm:text-xs">Vector:</span>
              <span className="font-mono tabular-nums font-semibold text-white text-xs sm:text-sm">
                {postureAngle > 0 ? `+${postureAngle}` : postureAngle}°
              </span>
            </div>

            {/* Layer 4 (Explanation) */}
            <p className="text-xs md:text-sm text-white/60 mt-2 md:mt-3 leading-relaxed">
              {flowExplanation}
            </p>
          </div>
        </div>

        {/* ── RIGHT CARD: BODY STRESS & HEART ── */}
        <div
          onClick={handleTrigger}
          className={`lg:order-3 w-full lg:w-[340px] p-3.5 sm:p-5 lg:p-6 rounded-2xl glass shadow-2xl flex flex-col justify-between shrink-0 transition-all border border-white/10 bg-white/[0.025] cursor-pointer select-none ${
            isPulsing
              ? 'ring-2 ring-rose-500/50 bg-white/[0.06] scale-[1.01]'
              : 'hover:border-white/20'
          }`}
        >
          <div>
            {/* Layer 1 (Header) */}
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 block font-sans truncate">
              BODY STRESS
            </span>

            {/* Layer 2 (Hero Row: Hero Number + Tiny Badge) */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between w-full mt-1.5 sm:mt-2 mb-1 gap-1 sm:gap-2">
              <span className="text-3xl md:text-4xl lg:text-5xl font-mono font-bold text-white tabular-nums tracking-tight">
                {liveEntropy} <span className="text-sm sm:text-lg text-white/40 font-normal">/ 250</span>
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider shrink-0 self-start sm:self-auto"
                style={{
                  color: stressStatus.color,
                  backgroundColor: `${stressStatus.color}18`,
                  border: `1px solid ${stressStatus.color}40`,
                }}
              >
                {stressStatus.label}
              </span>
            </div>

            {/* Layer 3 (Heart Rate / Sub-metric) */}
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/80">
              <Heart size={13} className="text-rose-400 fill-rose-400 shrink-0" />
              <span className="font-mono tabular-nums font-semibold text-white text-xs sm:text-sm">
                {liveBpm} BPM
              </span>
              <span className="text-white/40 hidden sm:inline">·</span>
              <span className="text-white/50 text-[11px] sm:text-xs hidden sm:inline">Resting HR</span>
            </div>

            {/* Layer 4 (Explanation) */}
            <p className="text-xs md:text-sm text-white/60 mt-2 md:mt-3 border-t border-white/10 pt-2 md:pt-3 leading-relaxed">
              {stressExplanation}
            </p>

            {/* Layer 5 (Interactive Exertion Trigger Button) */}
            <button
              type="button"
              onClick={handleTrigger}
              className="mt-3 sm:mt-4 w-full py-2.5 px-3 sm:px-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.97] border border-white/15 transition-all cursor-pointer select-none flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1.5 xs:gap-2 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Zap
                  size={14}
                  className="text-[var(--led-color)] animate-pulse shrink-0 fill-[var(--led-color)]/30"
                />
                <span className="text-xs font-medium text-white/90">
                  Tap Rapidly to Test Stress
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end xs:self-auto">
                <div className="w-8 sm:w-10 h-1.5 rounded-full bg-white/20 overflow-hidden shrink-0">
                  <div
                    className="h-full transition-all duration-150 rounded-full"
                    style={{
                      width: `${Math.min(100, agitationLevel)}%`,
                      backgroundColor: stressStatus.color,
                    }}
                  />
                </div>
                <span
                  className="text-[9px] sm:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/10 shrink-0 font-semibold"
                  style={{
                    color: agitationLevel > 20 ? stressStatus.color : undefined,
                  }}
                >
                  +Exertion
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILITY & MODAL COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function HeaderBtn({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="flex items-center gap-1.5 font-sans font-medium text-xs text-white/60 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

/* ─── ABOUT / FIELD NOTES MODAL ───────────────────────────────────── */

function FieldNotesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        className="relative glass rounded-2xl p-6 sm:p-8 w-full overflow-y-auto shadow-2xl"
        style={{
          maxWidth: 540,
          maxHeight: '85dvh',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h2 className="font-sans font-semibold text-sm tracking-wide text-white">
              About Temple GEN-02
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white transition-colors px-2 py-1 cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        <div className="space-y-5 font-sans text-xs sm:text-sm leading-relaxed text-white/70">
          <section>
            <h3 className="text-white font-semibold text-sm tracking-tight mb-1">
              Automatic State Deduction
            </h3>
            <p className="text-white/60 text-xs sm:text-sm">
              Temple constantly learns from your body without manual logging. Onboard optical sensors and motion trackers automatically measure cerebral blood flow, posture angles, and nervous system tension.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold text-sm tracking-tight mb-1">
              Posture &amp; Brain Oxygenation
            </h3>
            <p className="text-white/60 text-xs sm:text-sm">
              Every 15° of forward head tilt adds compressive strain onto your cervical spine, restricting carotid blood flow to your brain. Reclining reverses this strain, using gravity to flood your cortex with oxygen-rich blood.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold text-sm tracking-tight mb-1">
              Body Stress (Entropy)
            </h3>
            <p className="text-white/60 text-xs sm:text-sm">
              Micro-movements, restlessness, and arterial pulse variations directly reveal autonomic stress. When calm, your vascular system expands, maintaining optimal cognitive stamina.
            </p>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
