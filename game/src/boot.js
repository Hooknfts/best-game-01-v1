// Prism Drift — boot. The entry module: it builds the canvas, wires the
// controls, the sound bank and the simulation together, and runs the frame
// loop on a fixed timestep. It also handles the ?shot= staging used for the
// entry's screenshots: pose the scene, roll it forward a fixed number of
// steps, freeze it, and raise window.__prismShot so the screenshot script
// knows the frame is ready.

import { Controls } from './controls.js';
import { draw } from './painter.js';
import { Rng, seedFromQuery } from './rng.js';
import { createState, loadBest, update } from './simulation.js';
import { SoundBank } from './sound.js';
import { applyShot, shotFromQuery } from './staging.js';
import { VIEW } from './tuning.js';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const query = new URLSearchParams(window.location.search);
const rng = new Rng(seedFromQuery(query));
const state = createState(rng, loadBest());
const controls = new Controls(canvas);
const sound = new SoundBank();

// The first gesture unlocks audio (browsers block it until then).
const unlockAudio = () => sound.unlock();
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// A small handle for play-tests and the screenshot script. It is not part of
// the game the player sees.
window.__prism = { state, controls, sound };
window.__prismShot = 'live';

// Screenshot staging: pose the scene, roll it forward a fixed number of
// steps with a neutral input, then freeze it for the photograph.
const shotName = query.get('shot');
if (shotName !== null) {
  const steps = applyShot(state, shotFromQuery(query));
  const neutral = {
    steer: { x: 0, y: 0 },
    pointer: null,
    cycleColour: false,
    togglePause: false,
    toggleMute: false,
    confirm: false,
  };
  for (let i = 0; i < steps; i++) update(state, STEP, neutral, sound);
  state.frozen = true;
  window.__prismShot = 'ready';
}

let last = performance.now();
let backlog = 0;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  backlog += elapsed;
  let steps = 0;
  while (backlog >= STEP && steps < MAX_STEPS_PER_FRAME) {
    const input = {
      steer: controls.steer(),
      pointer: controls.pointer,
      cycleColour: controls.cycleColour,
      togglePause: controls.togglePause,
      toggleMute: controls.toggleMute,
      confirm: controls.confirm,
    };
    update(state, STEP, input, sound);
    controls.consume();
    backlog -= STEP;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_FRAME) backlog = 0;
  draw(ctx, state, now / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
