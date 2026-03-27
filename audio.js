/**
 * @file audio.js — Sound effects and dynamic music for All Fives Dominoes.
 *
 * Two classes:
 *  - {@link SFX} — Short oscillator-based sound effects (tile place, score,
 *    boneyard draw, win fanfare) using the Web Audio API.
 *  - {@link MusicEngine} — Ambient background music built from jazz chord
 *    progressions that adapt tempo and timbre to the current game intensity.
 *
 * No external audio files — everything is synthesized at runtime.
 */

// ---------------------------------------------------------------------------
// Sound Effects
// ---------------------------------------------------------------------------

/**
 * Oscillator-based sound effects using the Web Audio API.
 * All sounds are synthesized — no audio files needed.
 */
class SFX {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { console.warn('SFX: AudioContext unavailable', e); }
  }

  /**
   * Play a single oscillator tone.
   * @param {number} freq     - Frequency in Hz.
   * @param {number} duration - Duration in seconds.
   * @param {string} [type='sine'] - Oscillator waveform type.
   * @param {number} [vol=0.15]    - Peak volume (0–1).
   * @private
   */
  _play(freq, duration, type = 'sine', vol = 0.15) {
    if (!this.ctx || (window.game && window.game._soundMuted)) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /**
   * Play a noise burst (white noise through a bandpass filter) for percussive impact.
   * @param {number} freq     - Center frequency of the bandpass filter.
   * @param {number} duration - Duration in seconds.
   * @param {number} [vol=0.1] - Peak volume.
   * @private
   */
  _noise(freq, duration, vol = 0.1) {
    if (!this.ctx || (window.game && window.game._soundMuted)) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  /** Play tile-placement sound — layered thud + clack + table resonance. */
  place() {
    const pitchVar = 0.9 + Math.random() * 0.2;
    // Impact thud (low)
    this._play(120 * pitchVar, 0.08, 'sine', 0.12);
    // Clack (mid, sharp)
    this._noise(2000 * pitchVar, 0.04, 0.06);
    // Table resonance (warm tail)
    setTimeout(() => this._play(200 * pitchVar, 0.12, 'sine', 0.04), 15);
    // Subtle high click
    setTimeout(() => this._noise(4000, 0.02, 0.03), 5);
  }

  /** Play a heavier slam for doubles — deeper thud, louder impact. */
  placeDouble() {
    const pitchVar = 0.85 + Math.random() * 0.15;
    // Deep slam
    this._play(80 * pitchVar, 0.12, 'sine', 0.18);
    this._play(90 * pitchVar, 0.1, 'triangle', 0.08);
    // Heavy clack
    this._noise(1500, 0.06, 0.1);
    // Table rattle
    setTimeout(() => {
      this._play(160 * pitchVar, 0.15, 'sine', 0.06);
      this._noise(800, 0.08, 0.03);
    }, 20);
    // Resonant tail
    setTimeout(() => this._play(100, 0.2, 'sine', 0.03), 40);
  }

  /** Play scoring sound — ascending arpeggio with shimmer. */
  score() {
    this._play(523, 0.2, 'sine', 0.12);
    this._play(523, 0.15, 'triangle', 0.04);
    setTimeout(() => this._play(659, 0.2, 'sine', 0.12), 100);
    setTimeout(() => this._play(784, 0.25, 'sine', 0.12), 200);
    setTimeout(() => {
      this._play(1047, 0.35, 'sine', 0.1);
      this._play(1047, 0.2, 'triangle', 0.04);
    }, 320);
  }

  /** Play big score sound (15+) — richer arpeggio with harmonic shimmer. */
  scoreBig() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this._play(f, 0.3, 'sine', 0.12);
        this._play(f * 2, 0.2, 'sine', 0.03); // octave shimmer
      }, i * 90);
    });
    // Sparkle tail
    setTimeout(() => {
      this._play(2093, 0.4, 'sine', 0.04);
      this._play(2637, 0.3, 'sine', 0.02);
    }, 500);
  }

  /** Play boneyard draw sound — bone scrape + reluctant pickup. */
  draw() {
    this._noise(1200, 0.08, 0.06); // scrape
    this._play(300, 0.1, 'sine', 0.06);
    setTimeout(() => {
      this._play(250, 0.12, 'sine', 0.05);
      this._noise(800, 0.05, 0.03);
    }, 80);
    setTimeout(() => this._play(200, 0.15, 'sine', 0.04), 160);
  }

  /** Play shuffle/scramble sound — bones rattling on felt. */
  shuffle() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this._noise(1000 + Math.random() * 2000, 0.04, 0.04);
        this._play(100 + Math.random() * 100, 0.05, 'sine', 0.03);
      }, i * 60 + Math.random() * 30);
    }
  }

  /** Play win fanfare — triumphant ascending flourish with harmonics. */
  win() {
    const fanfare = [523, 659, 784, 1047, 1319, 1568];
    fanfare.forEach((f, i) => {
      setTimeout(() => {
        this._play(f, 0.4, 'sine', 0.1);
        this._play(f * 1.5, 0.3, 'sine', 0.03); // fifth harmonic
        if (i === fanfare.length - 1) {
          // Final chord sustain
          this._play(f, 0.8, 'sine', 0.08);
          this._play(f * 0.75, 0.8, 'sine', 0.05);
          this._play(f * 0.5, 0.8, 'sine', 0.04);
        }
      }, i * 110);
    });
  }

  /** Play loss sound — descending minor with muted feel. */
  lose() {
    [440, 392, 330, 262].forEach((f, i) =>
      setTimeout(() => {
        this._play(f, 0.35, 'sine', 0.08);
        this._play(f * 0.5, 0.3, 'sine', 0.03);
      }, i * 220)
    );
  }

  /** Play dramatic last-tile domino sound — building impact. */
  domino() {
    this._play(220, 0.08, 'sine', 0.1);
    this._noise(1000, 0.04, 0.06);
    setTimeout(() => { this._play(330, 0.08, 'sine', 0.1); this._noise(1500, 0.04, 0.05); }, 80);
    setTimeout(() => { this._play(440, 0.1, 'sine', 0.12); this._noise(2000, 0.04, 0.04); }, 170);
    setTimeout(() => { this._play(660, 0.15, 'sine', 0.14); }, 280);
    setTimeout(() => {
      this._play(880, 0.25, 'sine', 0.12);
      this._play(1320, 0.4, 'sine', 0.08);
      this._play(440, 0.3, 'sine', 0.06);
    }, 400);
  }

  /** Play a subtle tick for UI interactions. */
  tick() {
    this._noise(3000, 0.02, 0.03);
  }

  /** Play a blocked/pass sound — dull thud. */
  blocked() {
    this._play(100, 0.15, 'sine', 0.08);
    this._noise(400, 0.06, 0.04);
  }
}

// ---------------------------------------------------------------------------
// Dynamic Music Engine
// ---------------------------------------------------------------------------

/**
 * Ambient background music built from jazz chord progressions.
 *
 * Adapts to game intensity: higher intensity → faster tempo, brighter
 * timbre (triangle wave), and slightly sharper pitch. Cycles through
 * four chord progressions (classic, ii-V-I, smooth, standard).
 */
class MusicEngine {
  constructor() {
    this.playing = false;
    this.enabled = localStorage.getItem('domino_music') === '1';
    this.intensity = 0;
    this.ctx = null;
    this._nodes = [];
  }
  /** Initialize the AudioContext (lazy, called on first start). */
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { console.warn('MusicEngine: AudioContext unavailable', e); }
  }
  /** Start playback (no-op if already playing or disabled). */
  start() {
    if (!this.enabled || this.playing) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this._loop();
  }
  /** Stop playback and clean up oscillator nodes. */
  stop() {
    this.playing = false;
    this._nodes.forEach(n => { try { n.disconnect(); n.stop(); } catch(e) {} });
    this._nodes = [];
  }
  /**
   * Set the game intensity level (affects tempo and timbre).
   * @param {number} val - Intensity from 0 (calm) to 1 (intense).
   */
  setIntensity(val) { this.intensity = Math.max(0, Math.min(1, val)); }
  /** Toggle music on/off and persist preference to localStorage. */
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('domino_music', this.enabled ? '1' : '0');
    if (this.enabled) this.start(); else this.stop();
  }
  /**
   * Main music loop — schedules one chord voicing per call, then
   * re-invokes itself after a tempo-dependent delay.
   * @private
   */
  _loop() {
      if (!this.playing || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Extended jazz progression with more variety
      const progressions = [
        // Cmaj7 → Dm7 → Em7 → Fmaj7 (classic)
        [[130.81,164.81,196.00,246.94],[146.83,185.00,220.00,277.18],[164.81,207.65,246.94,311.13],[174.61,220.00,261.63,329.63]],
        // Am7 → D7 → Gmaj7 → Cmaj7 (jazz ii-V-I)
        [[110.00,130.81,164.81,196.00],[146.83,185.00,220.00,261.63],[98.00,123.47,146.83,185.00],[130.81,164.81,196.00,246.94]],
        // Fm7 → Bb7 → Ebmaj7 → Abmaj7 (smooth)
        [[174.61,207.65,261.63,311.13],[116.54,146.83,174.61,220.00],[155.56,196.00,233.08,293.66],[103.83,130.81,155.56,196.00]],
        // Dm7 → G7 → Cmaj7 → Am7 (standard)
        [[146.83,174.61,220.00,261.63],[98.00,123.47,146.83,185.00],[130.81,164.81,196.00,246.94],[110.00,130.81,164.81,196.00]],
      ];

      // Pick progression based on time, change every ~24 seconds
      const progIdx = Math.floor(now / 24) % progressions.length;
      const chords = progressions[progIdx];
      const chordIdx = Math.floor((now / 3) % chords.length);
      const chord = chords[chordIdx];

      const vol = 0.012 + this.intensity * 0.01;
      const types = ['sine', 'triangle', 'sine'];
      const oscType = this.intensity > 0.6 ? 'triangle' : 'sine';

      // Main chord
      for (let i = 0; i < chord.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = oscType;
        osc.frequency.value = chord[i] * (1 + this.intensity * 0.2);
        // Stagger note attacks slightly for a more natural feel
        const attackTime = now + i * 0.05;
        gain.gain.setValueAtTime(0, attackTime);
        gain.gain.linearRampToValueAtTime(vol, attackTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 2.8);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(attackTime); osc.stop(attackTime + 3);
        this._nodes.push(osc);
      }

      // Bass note
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.value = chord[0] / 2;
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(vol * 1.5, now + 0.08);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      bassOsc.connect(bassGain); bassGain.connect(ctx.destination);
      bassOsc.start(now); bassOsc.stop(now + 2.8);
      this._nodes.push(bassOsc);

      // Occasional high melodic note (every other chord)
      if (chordIdx % 2 === 0 && Math.random() > 0.3) {
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = 'sine';
        melOsc.frequency.value = chord[Math.floor(Math.random() * chord.length)] * 2;
        const melVol = vol * 0.4;
        melGain.gain.setValueAtTime(0, now + 0.5);
        melGain.gain.linearRampToValueAtTime(melVol, now + 0.6);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        melOsc.connect(melGain); melGain.connect(ctx.destination);
        melOsc.start(now + 0.5); melOsc.stop(now + 2.2);
        this._nodes.push(melOsc);
      }

      // Clean up old nodes — disconnect before dropping references
      const keep = this._nodes.slice(-30);
      for (const n of this._nodes) {
        if (!keep.includes(n)) { try { n.disconnect(); } catch(e) {} }
      }
      this._nodes = keep;
      const tempo = 2800 - this.intensity * 600;
      setTimeout(() => this._loop(), tempo);
    }
}
