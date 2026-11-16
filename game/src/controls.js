// Keyboard and mouse, read once per frame. Arrow keys and WASD steer, the
// mouse steers toward the pointer when it moved most recently, Space or a click
// cycles the ship's colour, 1/2/3 pick a colour outright, P pauses, M mutes.
export const SIG_START = 1;
export const SIG_PAUSE = 2;
export const SIG_MUTE = 4;
export const SIG_CYCLE = 8;

const CODE_SIGNALS = {
  Space: SIG_START | SIG_CYCLE,
  Enter: SIG_START,
  KeyP: SIG_PAUSE,
  Escape: SIG_PAUSE,
  KeyM: SIG_MUTE,
};

const PICK_CODES = { Digit1: 0, Digit2: 1, Digit3: 2 };

export function makeControls(canvas) {
  const held = new Set();
  let pending = 0;
  let pick = -1;
  let pointer = { x: 0, y: 0, live: false };
  let pointerLast = false;

  function toArena(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) * canvas.width) / box.width,
      y: ((event.clientY - box.top) * canvas.height) / box.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    const signal = CODE_SIGNALS[event.code];
    if (signal) {
      pending |= signal;
      event.preventDefault();
    }
    if (event.code in PICK_CODES) pick = PICK_CODES[event.code];
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointermove', (event) => {
    pointer = { ...toArena(event), live: true };
    pointerLast = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = { ...toArena(event), live: true };
    pointerLast = true;
    pending |= SIG_START | SIG_CYCLE;
    event.preventDefault();
  });

  return {
    /** Steering: a keyboard vector, or a mouse target when it steered last. */
    readSteer() {
      let ax = 0;
      let ay = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) ax -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) ax += 1;
      if (held.has('ArrowUp') || held.has('KeyW')) ay -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) ay += 1;
      if (ax !== 0 || ay !== 0) {
        pointerLast = false;
        const len = Math.hypot(ax, ay);
        return { ax: ax / len, ay: ay / len, mx: null, my: null };
      }
      if (pointer.live && pointerLast) return { ax: 0, ay: 0, mx: pointer.x, my: pointer.y };
      return { ax: 0, ay: 0, mx: null, my: null };
    },
    drainSignals() {
      const signals = pending;
      pending = 0;
      return signals;
    },
    drainPick() {
      const chosen = pick;
      pick = -1;
      return chosen;
    },
  };
}
