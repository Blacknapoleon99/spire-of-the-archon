/**
 * Procedural Web Audio API Sound and Music Synthesizer.
 * Completely self-contained, offline-ready, zero external audio asset dependencies.
 * Includes comprehensive SFX for spells, footsteps, impacts, voice lines, and ambient tracks.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicTimer = null;
    this.currentTrack = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.voiceGain = null;
    this.step = 0;
    this.footstepToggle = false;
    this.audioBuffers = new Map();
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this._masterVol !== undefined ? this._masterVol : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this._sfxVol !== undefined ? this._sfxVol : 0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this._musicVol !== undefined ? this._musicVol : 0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.setValueAtTime(this._voiceVol !== undefined ? this._voiceVol : 1.0, this.ctx.currentTime);
      this.voiceGain.connect(this.masterGain);

      this.preloadSfx();
    } catch (e) {}

    // Resume AudioContext on first user interaction cleanly
    const resumeOnGesture = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', resumeOnGesture, { once: true });
    window.addEventListener('keydown', resumeOnGesture, { once: true });
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMasterVolume(volume) {
    this._masterVol = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this._masterVol, this.ctx.currentTime);
    }
  }

  setSfxVolume(volume) {
    this._sfxVol = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this._sfxVol, this.ctx.currentTime);
    }
  }

  setMusicVolume(volume) {
    this._musicVol = Math.max(0, Math.min(1, volume));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this._musicVol, this.ctx.currentTime);
    }
  }

  setVoiceVolume(volume) {
    this._voiceVol = Math.max(0, Math.min(1, volume));
    if (this.voiceGain && this.ctx) {
      this.voiceGain.gain.setValueAtTime(this._voiceVol, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // ==========================================
  // FOOTSTEPS SYSTEM
  // ==========================================
  playFootstep(surface = 'stone') {
    if (this.isMuted) return;
    this.ensureContext();
    this.footstepToggle = !this.footstepToggle;

    let baseFreq = 180;
    let waveType = 'sine';
    let filterType = 'lowpass';
    let filterFreq = 700;

    if (surface === 'metal') {
      baseFreq = 280;
      waveType = 'triangle';
      filterType = 'bandpass';
      filterFreq = 1600;
    } else if (surface === 'crystal') {
      baseFreq = 880;
      waveType = 'sine';
      filterType = 'highpass';
      filterFreq = 2200;
    }

    const freq = this.footstepToggle ? baseFreq : baseFreq * 1.12;

    // 1. Thud component (heel impact)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(surface === 'crystal' ? 400 : 30, this.ctx.currentTime + 0.08);

    const heelVol = surface === 'crystal' ? 0.09 : 0.16;
    gain.gain.setValueAtTime(heelVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);

    // 2. Scuff component (surface acoustic friction)
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start();
  }

  // ==========================================
  // MAGIC & SPELL SOUNDS (MULTIPLE VARIETIES)
  // ==========================================

  // 1. Basic wand ping
  playWandCast() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  /**
   * Preload and decode all studio SFX into Web Audio buffers in memory
   */
  async preloadSfx() {
    if (!this.ctx) return;
    const files = [
      'sfx_fireball.mp3', 'sfx_flame_explosion.mp3', 'sfx_ice_lance.mp3',
      'sfx_frost_nova.mp3', 'sfx_radiant_heal.mp3', 'sfx_divine_sanctuary.mp3',
      'sfx_chrono_tick.mp3', 'sfx_door_open.mp3', 'sfx_puzzle_solve.mp3'
    ];
    for (const file of files) {
      try {
        const resp = await fetch(`/audio/sfx/${file}`);
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(file, decoded);
        }
      } catch (e) {}
    }
  }

  /**
   * Play studio sound effect with zero-latency memory AudioBuffer (0ms lag, zero GC)
   */
  playSfxFile(filename, fallbackFn) {
    if (this.isMuted) return;
    this.ensureContext();

    const buffer = this.audioBuffers?.get(filename);
    if (buffer && this.ctx) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.sfxGain || this.ctx.destination);
        src.start();
        return;
      } catch (e) {}
    }

    // Fallback: procedural synthesis if buffer decoding hasn't finished yet
    if (fallbackFn) {
      fallbackFn();
    }
  }

  // 2. Fireball cast & flame roar
  playFireball() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_fireball.mp3', () => {
      this.ensureContext();
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    });
  }

  // 3. Flame Nova / Meteor Explosion (Heavy Fire)
  playFlameExplosion() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_flame_explosion.mp3', () => {
      this.ensureContext();

      // Low sub-bass thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);

      // Rumble noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.7);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.7);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start();
    });
  }

  // Infernal Tornado Cyclonic Wind Roar & Buffeting Vortex
  playTornadoWindRoar(duration = 5.0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * Math.min(6.0, duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Pink/Brown noise with howling gusts
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        data[i] = (b0 + b1 + b2) * 0.85;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Swept resonant bandpass filter simulating whistling vortex wind
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3.5;
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      // LFO for swirling cyclonic wind buffeting
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(2.8, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Deep Sub-Bass Vortex Core Rumble
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
      subGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      subGain.gain.linearRampToValueAtTime(0.65, this.ctx.currentTime + 0.8);
      subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      mainGain.gain.linearRampToValueAtTime(0.75, this.ctx.currentTime + 0.4);
      mainGain.gain.setValueAtTime(0.7, this.ctx.currentTime + duration - 0.8);
      mainGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(this.sfxGain);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      noise.start();
      lfo.start();
      subOsc.start();

      noise.stop(this.ctx.currentTime + duration);
      lfo.stop(this.ctx.currentTime + duration);
      subOsc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('[SoundEngine] Tornado wind roar error:', e);
    }
  }

  // Tornado Wind Shredding Tick (for DPS hits inside vortex)
  playTornadoWindTick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 400, now);
      filter.Q.value = 4.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    } catch (e) {}
  }

  // Player Jump / Ascend Sound
  playJump() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // 4. Ice Lance crystal ping & freeze
  playIceLance() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_ice_lance.mp3', () => {
      this.ensureContext();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, this.ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    });
  }

  // 5. Frost Nova / Glacial Shatter
  playFrostNova() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_frost_nova.mp3', () => {
      this.ensureContext();
      [1600, 2100, 3200].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, this.ctx.currentTime + idx * 0.03 + 0.3);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.03 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(this.ctx.currentTime + idx * 0.03);
        osc.stop(this.ctx.currentTime + idx * 0.03 + 0.35);
      });
    });
  }

  // 6. Chain Lightning crackle
  playLightning() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.setValueAtTime(750, this.ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(140, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // 7. Radiant Heal (Luminary) — Celestial Choral Arpeggio
  playRadiantHeal() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_radiant_heal.mp3', () => {
      this.ensureContext();
      const notes = [440.00, 554.37, 659.25, 880.00];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0.28, this.ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.55);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(this.ctx.currentTime + idx * 0.07);
        osc.stop(this.ctx.currentTime + idx * 0.07 + 0.55);
      });
    });
  }

  // 8. Divine Sanctuary (Luminary Ultimate / Revive)
  playDivineSanctuary() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_divine_sanctuary.mp3', () => {
      this.ensureContext();
      [220.00, 329.63, 440.00, 659.25].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.2);
      });
    });
  }

  // 9. Chrono Time Warp / Stasis (Chronomancer) — Clockwork tick-tock & pitch warp
  playChrono() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_chrono_tick.mp3', () => {
      this.ensureContext();
      const tick = this.ctx.createOscillator();
      const tickGain = this.ctx.createGain();
      tick.type = 'square';
      tick.frequency.setValueAtTime(1400, this.ctx.currentTime);
      tick.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);
      tickGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      tickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      tick.connect(tickGain);
      tickGain.connect(this.sfxGain);
      tick.start();
      tick.stop(this.ctx.currentTime + 0.05);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    });
  }

  // 10. Arcane Shield / Barrier Activate
  playArcaneShield() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(750, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // 11. Blink / Dash whoosh
  playBlink() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 12. Impact / Hit sound
  playHit() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // 13. Critical Hit (Sharp strike)
  playCritHit() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.55, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // 14. Golem Ground Smash
  playGolemSmash() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // 15. Riddle Solved / Mystery Unlocked chime
  playPuzzleSolve() {
    if (this.isMuted) return;
    this.playSfxFile('sfx_puzzle_solve.mp3', () => {
      this.ensureContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C - E - G - C chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.6);
      });
    });
  }

  // 16. Riddle Wrong / Trap triggered
  playPuzzleFail() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // 17. Level Up Fanfare
  playLevelUp() {
    if (this.isMuted) return;
    this.ensureContext();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.01, this.ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.1 + 0.3);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + idx * 0.1);
      osc2.start(this.ctx.currentTime + idx * 0.1);
      osc.stop(this.ctx.currentTime + idx * 0.1 + 0.3);
      osc2.stop(this.ctx.currentTime + idx * 0.1 + 0.3);
    });
  }

  // 18. Death Sting
  playDeathSting() {
    if (this.isMuted) return;
    this.ensureContext();
    const freqs = [73.42, 87.31, 103.83];
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    });
  }

  // 19. Loot Pickup Chime
  playLootPickup() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 19b. Hitmarker Impact Sound
  playHitmarker(isCrit = false) {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isCrit ? 'triangle' : 'sine';
    const freq = isCrit ? 1480 : (840 + Math.random() * 80);
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isCrit ? 880 : 320, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(isCrit ? 0.28 : 0.16, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // 20. Quest Complete Regal Fanfare
  playQuestComplete() {
    if (this.isMuted) return;
    this.ensureContext();
    const chords = [
      [261.63, 329.63, 392.00], // C Major
      [329.63, 392.00, 493.88], // E Minor
      [392.00, 493.88, 587.33], // G Major
      [523.25, 659.25, 783.99, 1046.50] // High C Majestic Climax
    ];
    chords.forEach((chord, step) => {
      const startTime = this.ctx.currentTime + step * 0.24;
      const duration = step === 3 ? 1.4 : 0.6;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    });
  }

  // 21. Menu Open
  playMenuOpen() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 22. Menu Close
  playMenuClose() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 23. Potion Drink / Item Use
  playPotionDrink() {
    if (this.isMuted) return;
    this.ensureContext();
    const notes = [440, 550, 660];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.06 + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + idx * 0.06);
      osc.stop(this.ctx.currentTime + idx * 0.06 + 0.08);
    });
  }

  // ==========================================
  // AMBIENT & BOSS DYNAMIC MULTI-TRACK MUSIC
  // ==========================================
  startMusic(track = 'archives') {
    this.ensureContext();
    this.stopMusic();
    this.currentTrack = track;
    this.step = 0;

    if (this.musicGain && this.ctx && !this.isMuted) {
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime + 0.1);
    }

    // Floor 1 (Archives): Mystical D-Dorian Scale
    const archivesScale = [146.83, 164.81, 174.61, 196.00, 220.00, 261.63, 293.66, 329.63];
    // Floor 2 (Forge): Driving E-Phrygian Industrial Scale
    const forgeScale = [82.41, 87.31, 98.00, 110.00, 123.47, 130.81, 146.83, 164.81];
    // Floor 3 (Boss): Urgent D-Harmonic Minor / Diminished Battle Scale
    const bossScale = [110.00, 116.54, 130.81, 146.83, 155.56, 174.61, 196.00, 220.00];

    let tempo = 340;
    if (track === 'boss') tempo = 160;
    else if (track === 'forge') tempo = 250;

    this.musicTimer = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.step++;

      let scale = archivesScale;
      let pattern = [0, 2, 4, 7, 5, 3, 2, 4, 1, 3, 5, 2, 0, 4, 2, 6];
      let oscType = 'triangle';
      let noteDuration = (tempo / 1000) * 0.85;

      if (this.currentTrack === 'boss') {
        scale = bossScale;
        pattern = [0, 1, 3, 2, 4, 3, 6, 5, 7, 6, 4, 3, 2, 1, 0, 3];
        oscType = 'sawtooth';
        noteDuration = (tempo / 1000) * 0.7;
      } else if (this.currentTrack === 'forge') {
        scale = forgeScale;
        pattern = [0, 0, 2, 3, 1, 1, 4, 3, 0, 2, 4, 1, 3, 2, 0, 1];
        oscType = 'sawtooth';
        noteDuration = (tempo / 1000) * 0.6;
      }

      const noteIndex = pattern[this.step % pattern.length];
      const freq = scale[noteIndex % scale.length];

      // Primary melodic voice
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(this.currentTrack === 'boss' ? 0.18 : 0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + noteDuration);

      // Floor 2 Forge: Anvil clink accent on every 4th beat
      if (this.currentTrack === 'forge' && this.step % 4 === 0) {
        const anvil = this.ctx.createOscillator();
        const anvilGain = this.ctx.createGain();
        anvil.type = 'triangle';
        anvil.frequency.setValueAtTime(2489, this.ctx.currentTime); // D#7 anvil ring
        anvilGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
        anvilGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

        anvil.connect(anvilGain);
        anvilGain.connect(this.musicGain);
        anvil.start();
        anvil.stop(this.ctx.currentTime + 0.14);
      }

      // Deep sub-bass drone on beat 1
      if (this.step % 8 === 0) {
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(scale[0] * 0.5, this.ctx.currentTime);
        bassGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

        bass.connect(bassGain);
        bassGain.connect(this.musicGain);
        bass.start();
        bass.stop(this.ctx.currentTime + 1.2);
      }
    }, tempo);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      try {
        const curGain = Math.max(0.0001, this.musicGain.gain.value);
        this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(curGain, this.ctx.currentTime);
        this.musicGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
      } catch (e) {}
    }
  }

  // Enemy Combat Sounds & Ability Audio
  playSentinelLaser() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.32);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.32);
  }

  playGolemSlam() {
    if (this.isMuted) return;
    this.ensureContext();
    // Sub-bass impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.65);

    gain.gain.setValueAtTime(0.75, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.65);
  }

  playShadeBolt() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);
  }

  playEnemyMelee() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playEnemyAggro() {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(280, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playChatChirp(volumeMultiplier = 1.0) {
    if (this.isMuted) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.08);

    const targetVol = Math.max(0.01, Math.min(0.4, 0.28 * volumeMultiplier));
    gain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playQuillScribble() {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      // White noise scratch filtered for soft parchment friction
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2200 + (Math.random() - 0.5) * 600, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(3.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.sfxGain);
      noise.start();
    } catch (e) {}
  }

  playReverseTimeSpell() {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      const now = this.ctx.currentTime;
      // 1. Resonant ascending reverse sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.85);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.95);

      // 2. Crystalline temporal bell chimes
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const chimeOsc = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chimeOsc.type = 'triangle';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.4 + i * 0.08);

        chimeGain.gain.setValueAtTime(0.18, now + 0.4 + i * 0.08);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 + i * 0.08);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.sfxGain);
        chimeOsc.start(now + 0.4 + i * 0.08);
        chimeOsc.stop(now + 1.2 + i * 0.08);
      });
    } catch (e) {}
  }

  playResurrection() {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      const now = this.ctx.currentTime;
      // Deep divine heartbeat pulse
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(55, now);
      sub.frequency.exponentialRampToValueAtTime(110, now + 0.4);
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.6);

      // Celestial choir chord
      [440, 554.37, 659.25, 880].forEach((f) => {
        const choir = this.ctx.createOscillator();
        const choirGain = this.ctx.createGain();
        choir.type = 'sine';
        choir.frequency.setValueAtTime(f, now + 0.15);
        choirGain.gain.setValueAtTime(0.15, now + 0.15);
        choirGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        choir.connect(choirGain);
        choirGain.connect(this.sfxGain);
        choir.start(now + 0.15);
        choir.stop(now + 1.5);
      });
    } catch (e) {}
  }

  playGateOpen() {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      const now = this.ctx.currentTime;
      // Heavy stone friction rumble
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.linearRampToValueAtTime(45, now + 1.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.3);

      // Arcane unlock chime
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(880, now + 0.2);
      bell.frequency.exponentialRampToValueAtTime(1320, now + 0.6);
      bellGain.gain.setValueAtTime(0.2, now + 0.2);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      bell.connect(bellGain);
      bellGain.connect(this.sfxGain);
      bell.start(now + 0.2);
      bell.stop(now + 1.0);
    } catch (e) {}
  }

  playCoinPickup() {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      const now = this.ctx.currentTime;
      // High-pitched crystalline metallic coin chimes
      [1760, 2640, 3520].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.25 + idx * 0.03);

        gain.gain.setValueAtTime(0.22, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + idx * 0.03);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.32 + idx * 0.03);
      });
    } catch (e) {}
  }

  playMuzzleFlash(element = 'fire') {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      const freqs = {
        fire: { start: 420, end: 120, type: 'sawtooth' },
        frost: { start: 1200, end: 600, type: 'triangle' },
        light: { start: 880, end: 1760, type: 'sine' },
        chrono: { start: 300, end: 950, type: 'sine' }
      };
      const cfg = freqs[element] || freqs.fire;
      
      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.start, now);
      osc.frequency.exponentialRampToValueAtTime(cfg.end, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  playChestOpen() {
    if (this.isMuted) return;
    this.ensureContext();
    try {
      const now = this.ctx.currentTime;
      // Antique wood friction creak
      const creak = this.ctx.createOscillator();
      const creakGain = this.ctx.createGain();
      creak.type = 'sawtooth';
      creak.frequency.setValueAtTime(140, now);
      creak.frequency.linearRampToValueAtTime(80, now + 0.4);
      creakGain.gain.setValueAtTime(0.25, now);
      creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      creak.connect(creakGain);
      creakGain.connect(this.sfxGain);
      creak.start(now);
      creak.stop(now + 0.45);

      // Metallic padlock click
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(2200, now + 0.12);
      clickGain.gain.setValueAtTime(0.3, now + 0.12);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      click.connect(clickGain);
      clickGain.connect(this.sfxGain);
      click.start(now + 0.12);
      click.stop(now + 0.22);
    } catch (e) {}
  }
}

export const soundEngine = new SoundEngine();

// Export standalone helper functions for compatibility
export function playMenuOpen() { soundEngine.playMenuOpen(); }
export function playMenuClose() { soundEngine.playMenuClose(); }
export function playLevelUp() { soundEngine.playLevelUp(); }
export function playQuestComplete() { soundEngine.playQuestComplete(); }
export function playLootPickup() { soundEngine.playLootPickup(); }
export function playDeathSting() { soundEngine.playDeathSting(); }
