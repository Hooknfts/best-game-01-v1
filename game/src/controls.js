// Prism Drift — controls. One object owns every input: the keyboard state,
// the pointer position, and the edge-triggered requests (colour cycle, pause,
// mute, start/restart) that the simulation consumes once per frame.
//
// Keys: arrows or WASD steer. SPACE or a click cycles the ship's colour.
// P pauses, M mutes. SPACE also starts and restarts the run.

const STEER_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

export class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    // Currently held keys, by KeyboardEvent.code.
    this.held = new Set();
    // Pointer position in canvas pixels, or null until the pointer moves.
    this.pointer = null;
    // Edge requests, set by events and cleared by the simulation each frame.
    this.cycleColour = false;
    this.togglePause = false;
    this.toggleMute = false;
    this.confirm = false;

    window.addEventListener('keydown', (event) => {
      if (STEER_KEYS.has(event.code) || event.code === 'Space') event.preventDefault();
      if (event.repeat) return;
      this.held.add(event.code);
      if (event.code === 'Space') {
        this.cycleColour = true;
        this.confirm = true;
      }
      if (event.code === 'KeyP') this.togglePause = true;
      if (event.code === 'KeyM') this.toggleMute = true;
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });

    canvas.addEventListener('pointermove', (event) => {
      this.pointer = this.toCanvas(event);
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.pointer = this.toCanvas(event);
      this.cycleColour = true;
      this.confirm = true;
    });
  }

  /** A pointer event's position in canvas pixels. */
  toCanvas(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  /** Steering direction from the held keys: -1, 0 or 1 per axis. */
  steer() {
    let x = 0;
    let y = 0;
    if (this.held.has('ArrowLeft') || this.held.has('KeyA')) x -= 1;
    if (this.held.has('ArrowRight') || this.held.has('KeyD')) x += 1;
    if (this.held.has('ArrowUp') || this.held.has('KeyW')) y -= 1;
    if (this.held.has('ArrowDown') || this.held.has('KeyS')) y += 1;
    return { x, y };
  }

  /** Clear the one-shot requests after the simulation has read them. */
  consume() {
    this.cycleColour = false;
    this.togglePause = false;
    this.toggleMute = false;
    this.confirm = false;
  }
}
