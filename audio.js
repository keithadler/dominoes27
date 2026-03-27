// ============================================================
// ALL FIVES DOMINOES — Audio (SFX + Music)
// ============================================================

// --- Sound Effects ---
class SFX {
  constructor() {
    this.ctx = null;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
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
  place() {
    this._play(400, 0.06, 'square', 0.06);
    setTimeout(() => this._play(600, 0.08, 'sine', 0.08), 30);
  }
  score() {
    this._play(523, 0.2, 'sine', 0.15);
    setTimeout(() => this._play(659, 0.2, 'sine', 0.15), 120);
    setTimeout(() => this._play(784, 0.25, 'sine', 0.15), 240);
    setTimeout(() => this._play(1047, 0.3, 'sine', 0.12), 360);
  }
  draw() {
    // Sad descending tone for boneyard draw
    this._play(400, 0.15, 'sine', 0.1);
    setTimeout(() => this._play(320, 0.15, 'sine', 0.1), 120);
    setTimeout(() => this._play(260, 0.25, 'sine', 0.08), 240);
  }
  win() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      setTimeout(() => this._play(f, 0.35, 'sine', 0.12), i * 120)
    );
  }
}

// --- Dynamic Music (Web Audio) ---
class MusicEngine {
  constructor() {
    this.playing = false;
    this.enabled = localStorage.getItem('domino_music') === '1';
    this.intensity = 0;
    this.ctx = null;
    this._nodes = [];
  }
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  start() {
    if (!this.enabled || this.playing) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this._loop();
  }
  stop() {
    this.playing = false;
    this._nodes.forEach(n => { try { n.stop(); } catch(e) {} });
    this._nodes = [];
  }
  setIntensity(val) { this.intensity = Math.max(0, Math.min(1, val)); }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('domino_music', this.enabled ? '1' : '0');
    if (this.enabled) this.start(); else this.stop();
  }
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

      this._nodes = this._nodes.slice(-30);
      const tempo = 2800 - this.intensity * 600;
      setTimeout(() => this._loop(), tempo);
    }
}
