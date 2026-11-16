// The screenshot scenes behind ?shot=title|action|surge|end. Each one plays the
// real rules forward from a fresh simulation for a fixed number of steps,
// steered by a pilot that chases matching orbs, switches colour to meet them
// and shoves away from rocks and wrong-coloured orbs, so every frame is what a
// real game looks like and the same seed always gives the same frame.
import { ARENA, TICK } from './tuning.js';
import { EVT_END } from './simulation.js';
import { VIEW_OVER, VIEW_PLAY, VIEW_TITLE } from './painter.js';

const TITLE_SECONDS = 4;
const ACTION_SECONDS = 20;
const SURGE_SECONDS = 53.5;
const GOOD_SECONDS = 14;
const END_LIMIT_SECONDS = 600;

/** Steer toward the nearest reachable matching orb, switching colour to meet
 * it, with a shove away from anything that would hurt. The pilot prefers orbs
 * low on the screen, so the ship patrols the lower half and the sky above it
 * stays busy. */
function pilot(sim) {
  const state = sim.state;
  const ship = state.pilot;
  let target = null;
  let bestScore = Infinity;
  for (const drop of state.drops) {
    const dx = Math.abs(drop.x - ship.x);
    const dy = Math.abs(drop.y - ship.y);
    const mismatch = drop.hue === ship.hue ? 0 : 260;
    const tooHigh = Math.max(0, 300 - drop.y) * 0.9;
    const score = dx * 1.5 + dy * 0.3 + mismatch + tooHigh;
    if (score < bestScore) {
      bestScore = score;
      target = drop;
    }
  }
  if (target && target.hue !== ship.hue) sim.setPilotHue(target.hue);

  let steerX = 0;
  let steerY = 0;
  if (target) {
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const distance = Math.hypot(dx, dy) || 1;
    steerX = dx / distance;
    steerY = dy / distance;
  } else {
    // Nothing worth chasing: drift back to a patrol point low on the screen.
    const dx = ARENA.width / 2 - ship.x;
    const dy = 520 - ship.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > 40) {
      steerX = dx / distance;
      steerY = dy / distance;
    }
  }
  // Repulsion from rocks and wrong-coloured orbs close by.
  const hazards = [];
  for (const rock of state.rocks) hazards.push(rock);
  for (const drop of state.drops) if (drop.hue !== ship.hue) hazards.push(drop);
  for (const hazard of hazards) {
    const dx = ship.x - hazard.x;
    const dy = ship.y - hazard.y;
    const distance = Math.hypot(dx, dy);
    const range = hazard.r + 130;
    if (distance < range && distance > 1) {
      const push = ((range - distance) / range) * 2.6;
      steerX += (dx / distance) * push;
      steerY += (dy / distance) * push;
    }
  }
  const length = Math.hypot(steerX, steerY);
  if (length < 0.05) return { ax: 0, ay: 0, mx: null, my: null };
  return { ax: steerX / length, ay: steerY / length, mx: null, my: null };
}

/** Run the simulation forward, steered, until `seconds` pass or the game ends. */
function runFor(sim, seconds, steerFn) {
  for (let index = 0; index < seconds / TICK; index += 1) {
    const steer = steerFn ? steerFn(sim) : { ax: 0, ay: 0, mx: null, my: null };
    if (sim.advance(TICK, steer, false) & EVT_END) return true;
  }
  return false;
}

/** Steer at the nearest rock or wrong-coloured orb: the way a game ends. */
function kamikaze(sim) {
  const state = sim.state;
  const ship = state.pilot;
  let target = null;
  let bestDistance = Infinity;
  for (const rock of state.rocks) {
    const distance = Math.hypot(rock.x - ship.x, rock.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      target = rock;
    }
  }
  for (const drop of state.drops) {
    if (drop.hue === ship.hue) continue;
    const distance = Math.hypot(drop.x - ship.x, drop.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      target = drop;
    }
  }
  if (!target) return { ax: 0, ay: 0, mx: null, my: null };
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const length = Math.hypot(dx, dy) || 1;
  return { ax: dx / length, ay: dy / length, mx: null, my: null };
}

/**
 * Set `sim` to the named scene and return the view to paint over it and the
 * best score to show.
 */
export function stageScene(name, sim) {
  sim.restart();
  if (name === 'action') {
    runFor(sim, ACTION_SECONDS, pilot);
    return { view: VIEW_PLAY, best: sim.state.points };
  }
  if (name === 'surge') {
    runFor(sim, SURGE_SECONDS, pilot);
    return { view: VIEW_PLAY, best: sim.state.points };
  }
  if (name === 'end') {
    runFor(sim, GOOD_SECONDS, pilot);
    // Then a hurried player: fly straight at the nearest thing that hurts
    // and never switch colour, until the hearts run out.
    for (let index = 0; index < END_LIMIT_SECONDS / TICK; index += 1) {
      if (sim.advance(TICK, kamikaze(sim), false) & EVT_END) break;
    }
    return { view: VIEW_OVER, best: sim.state.points };
  }
  for (let index = 0; index < TITLE_SECONDS / TICK; index += 1) {
    sim.advance(TICK, { ax: 0, ay: 0, mx: null, my: null }, true);
  }
  return { view: VIEW_TITLE, best: 0 };
}
