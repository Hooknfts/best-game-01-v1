// Every sound the game makes, synthesized live with WebAudio oscillators: no
// audio files, no network, nothing to load. The context is created on the
// first player gesture, so browsers never block it, and M mutes it.
export function makeSound() {
  let ctx = null;
  let silent = false;
  let bus = null;

  function wakeContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      bus = ctx.createGain();
      bus.gain.value = 0.22;
      bus.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function blip({ hz, dur, wave = 'sine', vol = 0.4, at = 0, glide = 0 }) {
    if (!ctx || silent) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, t0);
    if (glide > 0) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function arpeggio(notes, dur, wave, vol, step) {
    notes.forEach((hz, i) => blip({ hz, dur, wave, vol, at: i * step }));
  }

  return {
    wake() {
      wakeContext();
    },
    flipMute() {
      silent = !silent;
      return silent;
    },
    muted() {
      return silent;
    },
    chime(chain) {
      if (!wakeContext()) return;
      const step = Math.min(chain, 16);
      const base = 420 * Math.pow(1.059, step);
      blip({ hz: base, dur: 0.12, vol: 0.5 });
      blip({ hz: base * 1.5, dur: 0.16, vol: 0.3, at: 0.03 });
    },
    buzz() {
      if (!wakeContext()) return;
      blip({ hz: 180, dur: 0.28, wave: 'sawtooth', vol: 0.4, glide: 70 });
      blip({ hz: 90, dur: 0.32, wave: 'square', vol: 0.25, at: 0.02, glide: 45 });
    },
    thud() {
      if (!wakeContext()) return;
      blip({ hz: 140, dur: 0.3, wave: 'sawtooth', vol: 0.5, glide: 50 });
      blip({ hz: 60, dur: 0.4, wave: 'triangle', vol: 0.5, glide: 35 });
    },
    arp() {
      if (!wakeContext()) return;
      arpeggio([523, 659, 784, 1047], 0.14, 'triangle', 0.35, 0.06);
    },
    rise() {
      if (!wakeContext()) return;
      blip({ hz: 392, dur: 0.18, wave: 'triangle', vol: 0.35 });
      blip({ hz: 587, dur: 0.24, wave: 'triangle', vol: 0.35, at: 0.12 });
    },
    fanfare() {
      if (!wakeContext()) return;
      arpeggio([262, 392, 523, 784], 0.16, 'triangle', 0.35, 0.07);
    },
    dirge() {
      if (!wakeContext()) return;
      arpeggio([392, 330, 262, 196], 0.3, 'triangle', 0.35, 0.16);
    },
  };
}
