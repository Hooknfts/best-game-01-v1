// Prism Drift — simulation. All of the game's rules live here: the run's
// state machine (title, playing, paused, over), the ship's movement, orb and
// rock spawning, colour matching, the combo, the waves, hearts and scoring.
// It knows nothing about drawing or input devices; boot.js feeds it a plain
// input object each frame and painter.js draws whatever it leaves behind.

import { COMBO, FX, GIFT, ORB, PRISM_COLOURS, ROCK, RUN, SHIP, STARS, VIEW, WAVES } from './tuning.js';

/** The modes a run can be in. */
export const MODE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
};

/** Read the saved best score; 0 when nothing is saved or storage is blocked. */
export function loadBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('prism-drift-best') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Save the best score, ignoring storage failures. */
export function saveBest(value) {
  try {
    window.localStorage.setItem('prism-drift-best', String(value));
  } catch {
    // A blocked storage is not a reason to stop the game.
  }
}

/** A fresh state: title screen, an empty field and a seeded starfield. */
export function createState(rng, best) {
  return {
    mode: MODE.TITLE,
    rng,
    time: 0,
    wave: 1,
    waveTime: 0,
    score: 0,
    best,
    combo: 1,
    comboTimer: 0,
    topCombo: 1,
    hearts: RUN.startHearts,
    ship: {
      x: VIEW.width * 0.3,
      y: VIEW.height * 0.5,
      vx: 0,
      vy: 0,
      colour: 0,
      shield: 0,
      tilt: 0,
    },
    orbs: [],
    rocks: [],
    gifts: [],
    particles: [],
    floats: [],
    stars: buildStars(rng),
    spawnTimer: 0.6,
    giftTimer: GIFT.everySeconds,
    shake: 0,
    shakeTime: 0,
    banner: null,
    // True while a screenshot is being staged: the world renders but does not advance.
    frozen: false,
  };
}

/** The starfield: each star knows its layer, position and twinkle phase. */
function buildStars(rng) {
  const stars = [];
  for (let layer = 0; layer < STARS.length; layer++) {
    const def = STARS[layer];
    for (let i = 0; i < def.count; i++) {
      stars.push({
        layer,
        x: rng.range(0, VIEW.width),
        y: rng.range(0, VIEW.height),
        phase: rng.range(0, Math.PI * 2),
      });
    }
  }
  return stars;
}

/** Start (or restart) a run from the title or game-over screen. */
export function startRun(state) {
  state.mode = MODE.PLAYING;
  state.time = 0;
  state.wave = 1;
  state.waveTime = 0;
  state.score = 0;
  state.combo = 1;
  state.comboTimer = 0;
  state.topCombo = 1;
  state.hearts = RUN.startHearts;
  state.ship.x = VIEW.width * 0.3;
  state.ship.y = VIEW.height * 0.5;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.ship.colour = state.rng.int(0, PRISM_COLOURS.length - 1);
  state.ship.shield = 0;
  state.orbs = [];
  state.rocks = [];
  state.gifts = [];
  state.particles = [];
  state.floats = [];
  state.spawnTimer = 0.5;
  state.giftTimer = GIFT.everySeconds;
  state.banner = { text: 'WAVE 1', sub: 'match your colour — dodge the rest', t: 2.2 };
}

/** How many orbs spawn per second at this wave. */
function spawnRate(wave) {
  return WAVES.spawnPerSecond + (wave - 1) * WAVES.spawnGrowth;
}

/** The share of spawns that are rocks at this wave. */
function rockShare(wave) {
  return Math.min(WAVES.rockCap, WAVES.rockShare + (wave - 1) * WAVES.rockGrowth);
}

/** Drift speed of an orb at this wave, with a per-orb random share. */
function orbSpeed(state) {
  return ORB.baseSpeed + (state.wave - 1) * WAVES.speedGrowth + state.rng.range(0, ORB.speedJitter);
}

/** Add one orb at a position, with a colour the caller may fix. */
export function spawnOrb(state, x, y, colour = null) {
  state.orbs.push({
    x,
    y,
    baseY: y,
    colour: colour ?? state.rng.int(0, PRISM_COLOURS.length - 1),
    speed: orbSpeed(state),
    phase: state.rng.range(0, Math.PI * 2),
    radius: ORB.radius,
  });
}

/** Add one rock at a position. */
export function spawnRock(state, x, y) {
  state.rocks.push({
    x,
    y,
    speed: ROCK.baseSpeed + (state.wave - 1) * WAVES.speedGrowth + state.rng.range(0, ROCK.speedJitter),
    angle: state.rng.range(0, Math.PI * 2),
    spin: state.rng.range(ROCK.spinMin, ROCK.spinMax) * (state.rng.chance(0.5) ? 1 : -1),
    radius: ROCK.radius,
  });
}

/** Add one heart gift at a position. */
export function spawnGift(state, x, y) {
  state.gifts.push({ x, y, speed: GIFT.speed, phase: state.rng.range(0, Math.PI * 2) });
}

/** A burst of glowing dots at a point, for absorbs, hits and gifts. */
export function burst(state, x, y, colour, count, power = 170) {
  for (let i = 0; i < count; i++) {
    const angle = state.rng.range(0, Math.PI * 2);
    const speed = state.rng.range(power * 0.3, power);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: state.rng.range(0.35, 0.7),
      maxLife: 0.7,
      colour,
      size: state.rng.range(2, 4.5),
    });
  }
}

/** A rising score label at a point. */
export function floatText(state, x, y, text, colour) {
  state.floats.push({ x, y, text, life: FX.floatSeconds, maxLife: FX.floatSeconds, colour });
}

/** The ship takes a hit: lose a heart, break the combo, shake and shield. */
function takeHit(state, sound) {
  if (state.ship.shield > 0) return;
  state.hearts -= RUN.hitCost;
  state.combo = 1;
  state.comboTimer = 0;
  state.ship.shield = SHIP.shieldSeconds;
  state.shake = FX.shakePixels;
  state.shakeTime = FX.shakeSeconds;
  burst(state, state.ship.x, state.ship.y, '#ffffff', FX.hitBurst, 230);
  sound.play('wrong');
  if (state.hearts <= 0) {
    state.hearts = 0;
    endRun(state, sound);
  }
}

/** The run ends: record the best score and show the game-over screen. */
function endRun(state, sound) {
  state.mode = MODE.OVER;
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
  burst(state, state.ship.x, state.ship.y, PRISM_COLOURS[state.ship.colour].main, FX.hitBurst * 2, 300);
  sound.play('over');
}

/** Steer the ship: keyboard acceleration, otherwise an ease toward the pointer. */
function moveShip(state, dt, input) {
  const ship = state.ship;
  const steer = input.steer;
  if (steer.x !== 0 || steer.y !== 0) {
    const len = Math.hypot(steer.x, steer.y) || 1;
    ship.vx += (steer.x / len) * SHIP.accel * dt;
    ship.vy += (steer.y / len) * SHIP.accel * dt;
    ship.tilt = steer.x * 0.22;
  } else if (input.pointer !== null) {
    const dx = input.pointer.x - ship.x;
    const dy = input.pointer.y - ship.y;
    ship.vx += dx * SHIP.mousePull * dt * 10;
    ship.vy += dy * SHIP.mousePull * dt * 10;
    ship.tilt = Math.max(-0.3, Math.min(0.3, dx * 0.0012));
  }
  const drag = Math.max(0, 1 - SHIP.drag * dt);
  ship.vx *= drag;
  ship.vy *= drag;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP.maxSpeed) {
    ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
    ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.x = Math.max(SHIP.margin, Math.min(VIEW.width - SHIP.margin, ship.x));
  ship.y = Math.max(SHIP.margin, Math.min(VIEW.height - SHIP.margin, ship.y));
  if (ship.shield > 0) ship.shield -= dt;
}

/** Spawn orbs and rocks from the right edge, on the wave's schedule. */
function spawnField(state, dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer += 1 / spawnRate(state.wave);
  const y = state.rng.range(50, VIEW.height - 50);
  const x = VIEW.width + 40;
  if (state.rng.chance(rockShare(state.wave))) {
    spawnRock(state, x, y);
  } else {
    spawnOrb(state, x, y);
  }
  // From wave 3, a second orb sometimes rides in beside the first.
  if (state.wave >= WAVES.doubleFromWave && state.rng.chance(0.3)) {
    spawnOrb(state, x + state.rng.range(30, 90), state.rng.range(50, VIEW.height - 50));
  }
  // A gift drifts by on its own slow timer.
  state.giftTimer -= dt;
  if (state.giftTimer <= 0) {
    state.giftTimer = GIFT.everySeconds;
    spawnGift(state, x, state.rng.range(80, VIEW.height - 80));
  }
}

/** Move every drifting entity left and drop the ones that left the screen. */
function driftField(state, dt) {
  for (const orb of state.orbs) {
    orb.x -= orb.speed * dt;
    orb.y = orb.baseY + Math.sin(state.time * ORB.wobbleFreq + orb.phase) * ORB.wobbleAmp;
  }
  for (const rock of state.rocks) {
    rock.x -= rock.speed * dt;
    rock.angle += rock.spin * dt;
  }
  for (const gift of state.gifts) {
    gift.x -= gift.speed * dt;
    gift.y += Math.sin(state.time * 2 + gift.phase) * 14 * dt;
  }
  state.orbs = state.orbs.filter((o) => o.x > -60);
  state.rocks = state.rocks.filter((r) => r.x > -60);
  state.gifts = state.gifts.filter((g) => g.x > -60);
}

/** Resolve every touch between the ship and the field. */
function collideField(state, sound) {
  const ship = state.ship;
  const touch = (entity, radius) => {
    const dx = entity.x - ship.x;
    const dy = entity.y - ship.y;
    const reach = SHIP.radius + radius - 4;
    return dx * dx + dy * dy < reach * reach;
  };

  for (let i = state.orbs.length - 1; i >= 0; i--) {
    const orb = state.orbs[i];
    if (!touch(orb, orb.radius)) continue;
    state.orbs.splice(i, 1);
    if (orb.colour === ship.colour) {
      const points = ORB.basePoints * state.combo;
      state.score += points;
      state.topCombo = Math.max(state.topCombo, state.combo);
      state.combo = Math.min(COMBO.max, state.combo + 1);
      state.comboTimer = COMBO.windowSeconds;
      burst(state, orb.x, orb.y, PRISM_COLOURS[orb.colour].main, FX.absorbBurst);
      floatText(state, orb.x, orb.y - 18, `+${points}`, PRISM_COLOURS[orb.colour].main);
      sound.play('absorb');
    } else {
      takeHit(state, sound);
    }
  }

  for (let i = state.rocks.length - 1; i >= 0; i--) {
    const rock = state.rocks[i];
    if (!touch(rock, rock.radius)) continue;
    state.rocks.splice(i, 1);
    takeHit(state, sound);
  }

  for (let i = state.gifts.length - 1; i >= 0; i--) {
    const gift = state.gifts[i];
    if (!touch(gift, GIFT.radius)) continue;
    state.gifts.splice(i, 1);
    state.hearts = Math.min(RUN.maxHearts, state.hearts + 1);
    state.score += RUN.giftPoints;
    burst(state, gift.x, gift.y, '#4ade80', FX.giftBurst);
    floatText(state, gift.x, gift.y - 18, `+${RUN.giftPoints} ♥`, '#4ade80');
    sound.play('gift');
  }
}

/** Advance particles, floating text, the banner and the shake. */
function advanceFx(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - 2.4 * dt);
    p.vy *= Math.max(0, 1 - 2.4 * dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.y -= FX.floatRise * dt;
    f.life -= dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
  if (state.banner !== null) {
    state.banner.t -= dt;
    if (state.banner.t <= 0) state.banner = null;
  }
  if (state.shakeTime > 0) {
    state.shakeTime -= dt;
    if (state.shakeTime <= 0) state.shake = 0;
  }
  // The starfield always drifts, even on the title screen.
  for (const star of state.stars) {
    star.x -= STARS[star.layer].speed * dt;
    if (star.x < 0) {
      star.x += VIEW.width;
      star.y = state.rng.range(0, VIEW.height);
    }
  }
}

/** Roll the wave clock forward and announce each new wave. */
function advanceWave(state, dt, sound) {
  state.waveTime += dt;
  if (state.waveTime < WAVES.lengthSeconds) return;
  state.waveTime -= WAVES.lengthSeconds;
  state.wave += 1;
  state.banner = { text: `WAVE ${state.wave}`, sub: 'faster — denser — stay sharp', t: 2.2 };
  sound.play('wave');
}

/**
 * One frame of the game. `input` carries the steering, the pointer, and the
 * one-shot requests the controls raised since the last frame. Returns nothing;
 * the state is mutated in place and painter.js draws it.
 */
export function update(state, dt, input, sound) {
  if (state.frozen) return;
  if (input.toggleMute) {
    sound.toggleMute();
  }

  if (state.mode === MODE.TITLE) {
    advanceFx(state, dt);
    if (input.confirm) {
      sound.unlock();
      sound.play('start');
      startRun(state);
    }
    return;
  }

  if (state.mode === MODE.OVER) {
    advanceFx(state, dt);
    if (input.confirm) {
      sound.unlock();
      startRun(state);
    }
    return;
  }

  if (input.togglePause) {
    state.mode = state.mode === MODE.PLAYING ? MODE.PAUSED : MODE.PLAYING;
    sound.play('click');
    return;
  }
  if (state.mode === MODE.PAUSED) {
    return;
  }

  // Playing.
  if (input.cycleColour) {
    state.ship.colour = (state.ship.colour + 1) % PRISM_COLOURS.length;
    sound.play('click');
  }
  state.time += dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 1;
  }
  moveShip(state, dt, input);
  spawnField(state, dt);
  driftField(state, dt);
  collideField(state, sound);
  advanceWave(state, dt, sound);
  advanceFx(state, dt);
}
