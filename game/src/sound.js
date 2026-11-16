// Prism Drift — sound. Everything is synthesized with the Web Audio API:
// short oscillator blips with an exponential decay, no audio files at all.
// The context is created lazily on the first user gesture (browsers block
// audio before that) and every call is a no-op when sound is muted or the
// context could not be created.

const NOTE = {
  absorb: [660, 880],
  wrong: [196, 131],
  gift: [523, 784, 1046],
  wave: [392, 523, 659],
  over: [330, 262, 196],
  start: [262, 392, 523],
  click: [440],
};

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  /** Create the context on a user gesture; safe to call repeatedly. */
  unlock() {
    if (this.ctx !== null) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (typeof Ctor !== 'function') return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Play one named cue: a short arpeggio of sine blips. */
  play(name) {
    if (this.muted || this.ctx === null || this.master === null) return;
    if (this.ctx.state !== 'running') return;
    const notes = NOTE[name];
    if (notes === undefined) return;
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const t0 = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = name === 'wrong' || name === 'over' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.9, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }
}
