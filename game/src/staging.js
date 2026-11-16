// Prism Drift — staging. The ?shot= URL parameter poses the game for a
// screenshot: title, mid-game action, a dense late wave, or the game-over
// screen. Each scene is built from a seeded RNG, so the same seed poses the
// same scene every time. Staging only arranges the state; boot.js then rolls
// it forward a fixed number of steps and freezes it for the shot.

import { MODE, burst, spawnGift, spawnOrb, spawnRock, startRun } from './simulation.js';
import { PRISM_COLOURS, VIEW } from './tuning.js';

/** The shots the page knows, in the order shots.json lists them. */
export const SHOTS = ['title', 'action', 'surge', 'gameover'];

/**
 * Pose `state` for the named shot. Returns how many fixed steps boot.js
 * should roll the world forward before freezing it (0 when the scene is
 * already exactly as it should be photographed).
 */
export function applyShot(state, name) {
  if (name === 'title') {
    // A living backdrop behind the title veil: a few orbs and rocks adrift.
    spawnOrb(state, 980, 180, 0);
    spawnOrb(state, 1120, 430, 1);
    spawnOrb(state, 760, 560, 2);
    spawnRock(state, 1050, 300);
    spawnRock(state, 860, 120);
    return 0;
  }

  if (name === 'action') {
    startRun(state);
    state.banner = null;
    state.score = 1250;
    state.combo = 5;
    state.comboTimer = 4.0;
    state.topCombo = 5;
    state.wave = 2;
    state.waveTime = 9;
    state.hearts = 3;
    state.ship.x = 420;
    state.ship.y = 360;
    state.ship.colour = 1;
    // A spread of orbs ahead of the ship: two in the ship's colour, the rest
    // a mix, plus a rock to dodge and a gift on its way in.
    spawnOrb(state, 640, 300, 1);
    spawnOrb(state, 720, 420, 1);
    spawnOrb(state, 830, 250, 0);
    spawnOrb(state, 900, 500, 2);
    spawnOrb(state, 1010, 340, 1);
    spawnOrb(state, 1140, 460, 0);
    spawnRock(state, 780, 560);
    spawnRock(state, 1080, 180);
    spawnGift(state, 1180, 380);
    burst(state, 640, 300, PRISM_COLOURS[1].main, 8, 120);
    burst(state, 1010, 340, PRISM_COLOURS[1].main, 8, 120);
    return 40;
  }

  if (name === 'surge') {
    startRun(state);
    state.banner = null;
    state.score = 8420;
    state.combo = 8;
    state.comboTimer = 4.0;
    state.topCombo = 8;
    state.wave = 5;
    state.waveTime = 14;
    state.hearts = 2;
    state.ship.x = 380;
    state.ship.y = 380;
    state.ship.colour = 0;
    // A dense late wave: a wall of orbs, several rocks, a gift threading in.
    const rows = [120, 200, 280, 360, 440, 520, 600];
    rows.forEach((y, i) => {
      spawnOrb(state, 620 + i * 62, y, i % 3);
      if (i % 2 === 0) spawnOrb(state, 700 + i * 55, y + 46, (i + 1) % 3);
    });
    spawnRock(state, 760, 160);
    spawnRock(state, 940, 640);
    spawnRock(state, 1120, 300);
    spawnRock(state, 860, 470);
    spawnGift(state, 1240, 220);
    burst(state, 700, 280, PRISM_COLOURS[0].main, 10, 140);
    burst(state, 940, 440, PRISM_COLOURS[2].main, 10, 140);
    return 40;
  }

  if (name === 'gameover') {
    startRun(state);
    state.banner = null;
    state.score = 8420;
    state.best = 8420;
    state.topCombo = 8;
    state.wave = 4;
    state.hearts = 0;
    state.mode = MODE.OVER;
    // A quiet field behind the veil, as if the run just ended.
    spawnOrb(state, 900, 200, 0);
    spawnOrb(state, 1080, 480, 2);
    spawnRock(state, 760, 560);
    burst(state, state.ship.x, state.ship.y, PRISM_COLOURS[0].main, 18, 200);
    return 0;
  }

  return 0;
}

/** Clamp a requested shot name to one the page knows, defaulting to title. */
export function shotFromQuery(query) {
  const raw = (query.get('shot') ?? '').toLowerCase();
  return SHOTS.includes(raw) ? raw : 'title';
}
