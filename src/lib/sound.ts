/**
 * Procedural Web Audio Engine for TEMPLE
 * Zero external audio files — all sounds are synthesized mathematically.
 * Tuned with layered harmonics, tremolo tension, optical scanning loops,
 * and biological stethoscope acoustics for rich playback on laptop speakers.
 */

class TempleAudio {
  private static instance: TempleAudio;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Stage 2: Hold to seal tension state
  private sealOsc: OscillatorNode | null = null;
  private sealLfo: OscillatorNode | null = null;
  private sealTremoloGain: GainNode | null = null;
  private sealLfoGain: GainNode | null = null;
  private sealGain: GainNode | null = null;

  // Stage 3: Continuous optical scanning loop state
  private scanNoise: AudioBufferSourceNode | null = null;
  private scanFilter: BiquadFilterNode | null = null;
  private scanLfo: OscillatorNode | null = null;
  private scanLfoGain: GainNode | null = null;
  private scanGain: GainNode | null = null;

  public enabled = true;

  private constructor() {}

  static getInstance(): TempleAudio {
    if (!TempleAudio.instance) {
      TempleAudio.instance = new TempleAudio();
    }
    return TempleAudio.instance;
  }

  /**
   * Explicitly initialize or resume the AudioContext on first user interaction
   */
  public init(): AudioContext {
    return this.ensureCtx();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master gain tuned for loud & clear playback on laptop speakers
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      // Dynamics compressor prevents distortion/clipping while maximizing fullness
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.ensureCtx();
    return this.masterGain!;
  }

  /** Short sine/triangle burst for UI clicks */
  playTick(freq = 240) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.008);

    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.01);
  }

  /**
   * 1. LAPTOP-OPTIMIZED "HOLD TO SEAL" TENSION (STAGE 2)
   * - Uses a triangle wave rich in odd harmonics for laptop audibility
   * - Exponential frequency sweep starting at 120Hz up to 350Hz over 2.5s
   * - 15Hz sine LFO tremolo connected to a GainNode to simulate mechanical/spring tension
   */
  startSealHum() {
    if (!this.enabled) return;
    this.stopSealHum(); // Stop any active hum first

    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const SWEEP_DUR = 2.5;

    // 1. Main carrier oscillator: triangle wave (120Hz -> 350Hz over 2.5s)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + SWEEP_DUR);

    // 2. Tremolo GainNode (carrier base gain)
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.5, t);

    // 3. 15Hz Sine LFO for mechanical stutter / spring tension
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(15, t);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, t); // Modulation depth: gain oscillates between 0.15 and 0.85

    lfo.connect(lfoGain);
    lfoGain.connect(tremoloGain.gain);

    // 4. Master volume envelope for seal hum
    this.sealGain = ctx.createGain();
    this.sealGain.gain.setValueAtTime(0.001, t);
    this.sealGain.gain.linearRampToValueAtTime(0.85, t + 0.08);
    this.sealGain.gain.linearRampToValueAtTime(1.0, t + SWEEP_DUR);

    osc.connect(tremoloGain);
    tremoloGain.connect(this.sealGain);
    this.sealGain.connect(this.getMaster());

    osc.start(t);
    lfo.start(t);

    this.sealOsc = osc;
    this.sealLfo = lfo;
    this.sealTremoloGain = tremoloGain;
    this.sealLfoGain = lfoGain;
  }

  stopSealHum() {
    if (this.sealGain && this.ctx) {
      const t = this.ctx.currentTime;
      try {
        this.sealGain.gain.setValueAtTime(this.sealGain.gain.value, t);
        this.sealGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      } catch {}
    }

    const osc = this.sealOsc;
    const lfo = this.sealLfo;
    const tGain = this.sealTremoloGain;
    const lGain = this.sealLfoGain;
    const sGain = this.sealGain;

    setTimeout(() => {
      try {
        osc?.stop();
        osc?.disconnect();
      } catch {}
      try {
        lfo?.stop();
        lfo?.disconnect();
      } catch {}
      try {
        lGain?.disconnect();
      } catch {}
      try {
        tGain?.disconnect();
      } catch {}
      try {
        sGain?.disconnect();
      } catch {}
    }, 70);

    this.sealOsc = null;
    this.sealLfo = null;
    this.sealTremoloGain = null;
    this.sealLfoGain = null;
    this.sealGain = null;
  }

  /**
   * 2. CONTINUOUS OPTICAL SCANNING TONE (STAGE 3)
   * - Looping white noise buffer
   * - Bandpass filter sweeping between 800Hz and 2000Hz using a 0.5Hz sine LFO
   * - Very low overall gain (0.05) creating a high-tech soft "laser scanning" texture
   */
  startScanningLoop() {
    if (!this.enabled) return;
    this.stopScanningLoop();

    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    // Generate white noise using an AudioBuffer
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Bandpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.5, t);
    // Center frequency at 1400Hz, sweeping between 800Hz and 2000Hz (+/- 600Hz)
    filter.frequency.setValueAtTime(1400, t);

    // 0.5Hz Sine LFO for laser sweep
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, t);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(600, t); // 1400 - 600 = 800Hz, 1400 + 600 = 2000Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Overall gain very low: 0.05
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMaster());

    noise.start(t);
    lfo.start(t);

    this.scanNoise = noise;
    this.scanFilter = filter;
    this.scanLfo = lfo;
    this.scanLfoGain = lfoGain;
    this.scanGain = gain;
  }

  stopScanningLoop() {
    if (this.scanGain && this.ctx) {
      const t = this.ctx.currentTime;
      try {
        this.scanGain.gain.setValueAtTime(this.scanGain.gain.value, t);
        this.scanGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      } catch {}
    }

    const noise = this.scanNoise;
    const lfo = this.scanLfo;
    const lGain = this.scanLfoGain;
    const filter = this.scanFilter;
    const gain = this.scanGain;

    setTimeout(() => {
      try {
        noise?.stop();
        noise?.disconnect();
      } catch {}
      try {
        lfo?.stop();
        lfo?.disconnect();
      } catch {}
      try {
        lGain?.disconnect();
      } catch {}
      try {
        filter?.disconnect();
      } catch {}
      try {
        gain?.disconnect();
      } catch {}
    }, 120);

    this.scanNoise = null;
    this.scanFilter = null;
    this.scanLfo = null;
    this.scanLfoGain = null;
    this.scanGain = null;
  }

  /**
   * 3. REALISTIC "LUB-DUB" HEARTBEAT (STAGE 3)
   * - "Lub" (Beat 1): 180Hz -> 60Hz over 100ms (Attack: 0.01s, Decay: 0.1s)
   * - "Dub" (Beat 2): Exactly 150ms later, 220Hz -> 80Hz over 80ms (slightly quieter envelope)
   */
  playLubDub() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    // ── The "Lub" (Beat 1) ──
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(180, t);
    osc1.frequency.exponentialRampToValueAtTime(60, t + 0.1);

    // Volume envelope (Attack: 0.01s, Decay: 0.1s)
    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.linearRampToValueAtTime(0.95, t + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.01 + 0.1);

    osc1.connect(gain1);
    gain1.connect(this.getMaster());

    osc1.start(t);
    osc1.stop(t + 0.12);

    // ── The "Dub" (Beat 2): Exactly 150ms later ──
    const t2 = t + 0.15;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(220, t2);
    osc2.frequency.exponentialRampToValueAtTime(80, t2 + 0.08);

    // Volume envelope (Attack: 0.008s, Decay: 0.08s, slightly quieter)
    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.linearRampToValueAtTime(0.72, t2 + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.008 + 0.08);

    osc2.connect(gain2);
    gain2.connect(this.getMaster());

    osc2.start(t2);
    osc2.stop(t2 + 0.1);
  }

  /** Alias for playLubDub to maintain backwards compatibility */
  playHeartbeat() {
    this.playLubDub();
  }

  /**
   * 4. BRIGHT HARDWARE SUCCESS CHIME
   * - 4-note chord [523.25, 659.25, 783.99, 1046.50] (C5, E5, G5, C6)
   * - Layered sine + triangle for purity and presence on laptop speakers
   * - Sharp attack (0.02s) and long overlapping exponential decay (1.5s)
   * - Rapid cascading 30ms stagger between notes for luxury digital harp effect
   */
  playSyncChime() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    freqs.forEach((freq, i) => {
      const noteTime = t + i * 0.03; // 30ms stagger

      // Sine wave for harmonic purity
      const sineOsc = ctx.createOscillator();
      sineOsc.type = 'sine';
      sineOsc.frequency.setValueAtTime(freq, noteTime);

      // Triangle wave for bright overtone presence
      const triOsc = ctx.createOscillator();
      triOsc.type = 'triangle';
      triOsc.frequency.setValueAtTime(freq, noteTime);

      const sineGain = ctx.createGain();
      sineGain.gain.value = 0.38;

      const triGain = ctx.createGain();
      triGain.gain.value = 0.12;

      // Note envelope: sharp attack (0.02s) + long exponential decay (1.5s)
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.9, noteTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.02 + 1.5);

      sineOsc.connect(sineGain);
      triOsc.connect(triGain);

      sineGain.connect(noteGain);
      triGain.connect(noteGain);

      noteGain.connect(this.getMaster());

      sineOsc.start(noteTime);
      triOsc.start(noteTime);

      sineOsc.stop(noteTime + 1.6);
      triOsc.stop(noteTime + 1.6);
    });
  }

  /** Lock-click: a sharp metallic snap */
  playLockClick() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();

    // Noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.02);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 6);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Band-pass for metallic character
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3800;
    filter.Q.value = 2.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.75, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMaster());
    noise.start(ctx.currentTime);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopSealHum();
      this.stopScanningLoop();
    }
    return this.enabled;
  }
}

export const templeAudio = TempleAudio.getInstance();

// Auto-unlock Web Audio on the very first user gesture anywhere
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    templeAudio.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

