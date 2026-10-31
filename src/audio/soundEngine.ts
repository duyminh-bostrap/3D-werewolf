/**
 * Procedural Gothic Horror Web Audio Synthesizer
 * Background music with synthesized sound effects.
 */

class GothicSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private volume = 1;
  private outputGain: GainNode | null = null;
  private bgmLevel = 0.42;
  private ambientRunning = false;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private windNode: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmLoopStart = 0;
  private bgmLoopEnd = 0; // 0 means full track loop
  private unlockBound = false;
  private lastCardFlipTime = -Infinity;

  private ensureBgmAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.bgmAudio) {
      const audio = new Audio('/assets/werewolf-ambient-loop.mp3');
      audio.loop = true;
      audio.preload = 'auto';

      // Enforce custom sub-segment loop if configured (e.g. trimmed loop window)
      audio.addEventListener('timeupdate', () => {
        if (this.bgmLoopEnd > this.bgmLoopStart + 2 && audio.currentTime >= this.bgmLoopEnd) {
          audio.currentTime = this.bgmLoopStart;
          if (audio.paused && !this.isMuted) {
            audio.play().catch(() => {});
          }
        }
      });

      this.bgmAudio = audio;
    }

    if (!this.bgmSource) {
      const ctx = this.ensureContext(true);
      if (!ctx) return null;
      this.bgmSource = ctx.createMediaElementSource(this.bgmAudio);
      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.value = this.bgmLevel;
      this.bgmSource.connect(this.bgmGain);
      this.bgmGain.connect(this.outputGain!);
    }

    if (!this.unlockBound) {
      this.unlockBound = true;
      const unlock = () => {
        if (!this.isMuted && this.bgmAudio && this.bgmAudio.paused) {
          this.bgmAudio.play().catch(() => {});
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }

    return this.bgmAudio;
  }

  /**
   * Allows loading a custom audio file and cutting a specific loop segment [startSec, endSec].
   */
  public setCustomLoopTrack(url: string, startSec = 0, endSec = 0) {
    const audio = this.ensureBgmAudio();
    if (!audio) return;
    this.bgmLoopStart = Math.max(0, startSec);
    this.bgmLoopEnd = endSec > startSec ? endSec : 0;
    audio.src = url;
    audio.loop = true;
    audio.currentTime = this.bgmLoopStart;
    if (!this.isMuted) {
      audio.play().catch(() => {});
    }
  }

  private ensureContext(forVoice = false): AudioContext | null {
    if ((!forVoice && this.isMuted) || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx({ latencyHint: 'balanced' });
      this.outputGain = this.ctx.createGain();
      this.outputGain.gain.value = this.isMuted ? 0 : this.volume;
      this.outputGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getVoiceAnalysisContext(): AudioContext | null {
    return this.ensureContext(true);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.outputGain && this.ctx) this.outputGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.08, this.ctx.currentTime, 0.15);
    }
    if (this.bgmAudio) {
      if (muted) {
        this.bgmAudio.pause();
      } else {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.outputGain && this.ctx) this.outputGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.04);
  }

  /**
   * Starts the Gothic background music loop (/assets/werewolf-ambient-loop.mp3) + atmospheric wind.
   */
  public startAmbient(mode: 'night' | 'day' | 'lobby' = 'lobby') {
    this.bgmLevel = mode === 'night' ? 0.48 : mode === 'day' ? 0.34 : 0.42;
    const bgm = this.ensureBgmAudio();
    if (this.bgmGain && this.ctx) this.bgmGain.gain.setTargetAtTime(this.bgmLevel, this.ctx.currentTime, 0.04);
    if (bgm && !this.isMuted) {
      if (bgm.paused) {
        bgm.play().catch(() => {});
      }
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.ambientRunning) {
      this.ambientRunning = true;
      const master = ctx.createGain();
      master.gain.value = this.isMuted ? 0 : 0.08;
      master.connect(this.outputGain!);
      this.ambientGain = master;

      // Dark sub-bass pipe organ drone (D1 + A1 fifth)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.value = 32.7; // C1
      osc2.frequency.value = 65.41; // C2

      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.25;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(master);

      osc1.start();
      osc2.start();
      this.droneOsc1 = osc1;
      this.droneOsc2 = osc2;

      // Filtered pink-ish wind noise
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        output[i] = (b0 + b1 + b2) * 0.22;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 340;
      windFilter.Q.value = 3.5;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.35;

      whiteNoise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      whiteNoise.start();
      this.windNode = whiteNoise;
    }

    // Shift harmonic tension by phase
    if (this.droneOsc1 && this.droneOsc2 && this.ctx) {
      const now = this.ctx.currentTime;
      if (mode === 'night') {
        this.droneOsc1.frequency.setTargetAtTime(32.7, now, 0.5);
        this.droneOsc2.frequency.setTargetAtTime(46.25, now, 0.5);
      } else if (mode === 'day') {
        this.droneOsc1.frequency.setTargetAtTime(32.7, now, 0.5);
        this.droneOsc2.frequency.setTargetAtTime(65.41, now, 0.5);
      } else {
        this.droneOsc1.frequency.setTargetAtTime(32.7, now, 0.5);
        this.droneOsc2.frequency.setTargetAtTime(49.0, now, 0.5);
      }
    }
  }

  /**
   * Eerie echoing Werewolf howl across the Gothic valley.
   */
  public playWolfHowl() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'sine';

    // Pitch contour of a wolf howl: rise -> sustain vibrato -> mournful fall
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.65);
    osc.frequency.setValueAtTime(440, now + 1.4);
    osc.frequency.exponentialRampToValueAtTime(260, now + 2.6);

    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(220, now + 0.65);
    sub.frequency.exponentialRampToValueAtTime(130, now + 2.6);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.Q.value = 2.8;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.35);
    gain.gain.setValueAtTime(0.2, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputGain!);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 2.75);
    sub.stop(now + 2.75);
  }

  /**
   * Deep metallic Gothic Cathedral Bell toll.
   */
  public playChurchBell() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Inharmonic bell partials
    const partials = [146.83, 293.66, 350.0, 440.0, 587.33, 810.0];
    const gains = [0.22, 0.16, 0.12, 0.09, 0.05, 0.03];

    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const duration = 3.2 - idx * 0.35;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(gains[idx], now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      osc.connect(g);
      g.connect(this.outputGain!);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  /**
   * 3D Tarot Card Flip & Mystical Reveal Sting.
   */
  public playCardFlip(isWerewolf = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastCardFlipTime < 1.55) return;
    this.lastCardFlipTime = now;

    // Whoosh noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.22);

    const ng = ctx.createGain();
    ng.gain.value = 0.18;
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.outputGain!);
    noise.start(now);

    // Chord sting
    const freqs = isWerewolf ? [110, 130.81, 155.56, 220] : [220, 277.18, 329.63, 440];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = isWerewolf ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now + 0.12 + i * 0.04);

      g.gain.setValueAtTime(0.001, now + 0.12);
      g.gain.linearRampToValueAtTime(0.09, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(g);
      g.connect(this.outputGain!);
      osc.start(now + 0.12);
      osc.stop(now + 1.55);
    });
  }

  /**
   * Visceral claw slash & horror sting when a victim falls at night.
   */
  public playHorrorSlash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.38);

    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(g);
    g.connect(this.outputGain!);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Tense low double-thud heartbeat for trial voting or night danger.
   */
  public playHeartbeat() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.24].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 68 : 54, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.18);

      g.gain.setValueAtTime(0.3, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);

      osc.connect(g);
      g.connect(this.outputGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
  }

  /**
   * Subtle pitch-varied cobblestone footstep crunch.
   */
  public playFootstep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const pitchVariation = 0.92 + Math.random() * 0.16;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.065);

    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(g);
    g.connect(this.outputGain!);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  /**
   * Crisp cloak-whoosh & boot spring when jumping in the 3D village.
   */
  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);

    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(g);
    g.connect(this.outputGain!);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  /**
   * Blazing fireball kick impact + roaring flame whoosh across the Gothic square.
   */
  public playFireballKick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Low meteor thump
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(165, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.22);
    subGain.gain.setValueAtTime(0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    sub.connect(subGain);
    subGain.connect(this.outputGain!);
    sub.start(now);
    sub.stop(now + 0.25);

    // 2. Blazing flame whoosh burst
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.28), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 0.7);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1250, now + 0.14);
    filter.frequency.exponentialRampToValueAtTime(280, now + 0.27);
    filter.Q.value = 2.2;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.2, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.outputGain!);
    noise.start(now);
  }

  /**
   * Sparkling crystalline chime when sending a Heart or adding a Friend.
   */
  public playHeartChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);

      g.gain.setValueAtTime(0.001, now + i * 0.055);
      g.gain.linearRampToValueAtTime(0.11, now + i * 0.055 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.38);

      osc.connect(g);
      g.connect(this.outputGain!);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.4);
    });
  }

  /**
   * Parabolic whoosh + crisp cobble stone bonk when throwing a rock at a character.
   */
  public playStoneThrow() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Throw whoosh
    const whoosh = ctx.createOscillator();
    const wg = ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(280, now);
    whoosh.frequency.exponentialRampToValueAtTime(120, now + 0.18);
    wg.gain.setValueAtTime(0.08, now);
    wg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    whoosh.connect(wg);
    wg.connect(this.outputGain!);
    whoosh.start(now);
    whoosh.stop(now + 0.21);

    // Rock impact bonk at +0.32s
    const hitTime = now + 0.32;
    const bonk = ctx.createOscillator();
    const bg = ctx.createGain();
    bonk.type = 'triangle';
    bonk.frequency.setValueAtTime(190, hitTime);
    bonk.frequency.exponentialRampToValueAtTime(52, hitTime + 0.14);
    bg.gain.setValueAtTime(0.22, hitTime);
    bg.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.16);
    bonk.connect(bg);
    bg.connect(this.outputGain!);
    bonk.start(hitTime);
    bonk.stop(hitTime + 0.17);
  }
}

export const soundEngine = new GothicSoundEngine();


