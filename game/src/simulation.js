// Prism Drift's rules: a prism-ship flies a neon nebula, absorbs light orbs
// that match its colour, and dodges rocks and wrong-coloured orbs. Matching
// orbs build a chain and a score boost; a wrong orb or a rock costs a heart.
// Stages rise every 25 seconds; gifts (heart, slow, nova) drop rarely. Three
// hearts gone is game over.
import { ARENA, DROP, HUES, PLAY, ROCK, VESSEL } from './tuning.js';
import { makeFx } from './fx.js';

export const EVT_TAKE = 1;
export const EVT_MISS = 2;
export const EVT_SMASH = 4;
export const EVT_END = 8;
export const EVT_STAGE = 16;
export const EVT_GIFT = 32;

const GIFT_KINDS = ['heart', 'slow', 'nova'];

export function makeSim(rng) {
  const fx = makeFx();
  const state = {
    pilot: { x: VESSEL.homeX, y: VESSEL.homeY, vx: 0, vy: 0, hue: 0, lean: 0 },
    drops: [],
    rocks: [],
    gifts: [],
    fx,
    points: 0,
    chain: 0,
    bestChain: 0,
    boost: 1,
    hearts: PLAY.hearts,
    stage: 1,
    clock: 0,
    slowTill: 0,
    safeTill: 0,
    tremor: 0,
    flare: 0,
    flag: null,
    done: false,
  };
  let dropTimer = 0.4;
  let giftTimer = PLAY.giftEverySeconds;
  let drift = 0;

  function boostFor(chain) {
    return Math.min(PLAY.maxBoost, 1 + Math.floor(chain / PLAY.chainStep));
  }

  function releaseDrop() {
    const stage = state.stage;
    const drop = {
      x: rng.between(40, ARENA.width - 40),
      y: -30,
      homeX: 0,
      vy: (DROP.fall + stage * DROP.fallPerStage) * rng.between(0.85, 1.2),
      swayPhase: rng.between(0, Math.PI * 2),
      swayRate: rng.between(0.6, 1.4),
      hue: Math.floor(rng.next() * HUES.length),
      r: DROP.r,
      spin: rng.between(-1.5, 1.5),
      angle: 0,
    };
    drop.homeX = drop.x;
    state.drops.push(drop);
  }

  function releaseRock() {
    const r = rng.between(ROCK.minR, ROCK.maxR);
    const corners = [];
    const sides = 8;
    for (let i = 0; i < sides; i += 1) {
      const angle = (i / sides) * Math.PI * 2;
      corners.push({ angle, r: r * rng.between(0.75, 1.15) });
    }
    state.rocks.push({
      x: rng.between(50, ARENA.width - 50),
      y: -50,
      vy: (ROCK.fall + state.stage * ROCK.fallPerStage) * rng.between(0.9, 1.25),
      vx: rng.between(-25, 25),
      r,
      corners,
      rotation: rng.between(0, Math.PI * 2),
      spin: rng.between(-1.2, 1.2),
    });
  }

  function releaseGift() {
    state.gifts.push({
      x: rng.between(60, ARENA.width - 60),
      y: -30,
      vy: 85,
      kind: GIFT_KINDS[Math.floor(rng.next() * GIFT_KINDS.length)],
      r: 18,
      phase: 0,
    });
  }

  function dropOne() {
    if (rng.test(Math.min(0.55, PLAY.rockChance + state.stage * PLAY.rockChancePerStage))) releaseRock();
    else releaseDrop();
  }

  function hurtPilot(events) {
    state.hearts -= 1;
    state.chain = 0;
    state.boost = 1;
    // A second of grace after every hit, so one mistake never chains into two.
    state.safeTill = state.clock + 1.2;
    state.tremor = PLAY.tremorOnSmash;
    state.flare = 0.35;
    fx.spray(state.pilot.x, state.pilot.y, '#ff4d5e', 26, 320);
    if (state.hearts <= 0) {
      state.done = true;
      return events | EVT_END;
    }
    return events;
  }

  function takeDrop(drop, index) {
    state.drops.splice(index, 1);
    state.chain += 1;
    state.bestChain = Math.max(state.bestChain, state.chain);
    state.boost = boostFor(state.chain);
    const gained = PLAY.pointsEach * state.boost;
    state.points += gained;
    const hue = HUES[drop.hue];
    fx.spray(drop.x, drop.y, hue.core, 16, 260);
    fx.float(drop.x, drop.y - 10, `+${gained}`, hue.halo);
    return EVT_TAKE;
  }

  function useGift(gift) {
    if (gift.kind === 'heart') {
      state.hearts = Math.min(PLAY.maxHearts, state.hearts + 1);
      fx.float(state.pilot.x, state.pilot.y - 30, '+1 HEART', '#7dff9b');
    } else if (gift.kind === 'slow') {
      state.slowTill = state.clock + PLAY.slowSeconds;
      fx.float(state.pilot.x, state.pilot.y - 30, 'SLOW TIME', '#8fb7ff');
    } else {
      let cleared = 0;
      for (let i = state.rocks.length - 1; i >= 0; i -= 1) {
        const rock = state.rocks[i];
        fx.spray(rock.x, rock.y, '#ffe95d', 12, 240);
        state.rocks.splice(i, 1);
        cleared += 1;
      }
      for (let i = state.drops.length - 1; i >= 0; i -= 1) {
        if (state.drops[i].hue !== state.pilot.hue) {
          fx.spray(state.drops[i].x, state.drops[i].y, '#ffe95d', 8, 200);
          state.drops.splice(i, 1);
          cleared += 1;
        }
      }
      state.points += cleared * 5;
      fx.float(state.pilot.x, state.pilot.y - 30, `NOVA +${cleared * 5}`, '#ffe95d');
    }
    fx.spray(state.pilot.x, state.pilot.y, '#ffffff', 22, 280);
    return EVT_GIFT;
  }

  function steerPilot(dt, steer) {
    const pilot = state.pilot;
    const slow = state.clock < state.slowTill ? PLAY.slowFactor : 1;
    if (steer.mx !== null && steer.my !== null) {
      const dx = steer.mx - pilot.x;
      const dy = steer.my - pilot.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        const speed = Math.min(VESSEL.topSpeed, distance * 6) * slow;
        pilot.vx = (dx / distance) * speed;
        pilot.vy = (dy / distance) * speed;
      } else {
        pilot.vx *= 1 - 8 * dt;
        pilot.vy *= 1 - 8 * dt;
      }
    } else {
      pilot.vx += steer.ax * VESSEL.thrust * dt * slow;
      pilot.vy += steer.ay * VESSEL.thrust * dt * slow;
      const drag = Math.exp(-VESSEL.drag * dt);
      pilot.vx *= drag;
      pilot.vy *= drag;
      const speed = Math.hypot(pilot.vx, pilot.vy);
      if (speed > VESSEL.topSpeed) {
        pilot.vx = (pilot.vx / speed) * VESSEL.topSpeed;
        pilot.vy = (pilot.vy / speed) * VESSEL.topSpeed;
      }
    }
    pilot.x = Math.min(ARENA.width - VESSEL.r, Math.max(VESSEL.r, pilot.x + pilot.vx * dt));
    pilot.y = Math.min(ARENA.height - VESSEL.r, Math.max(VESSEL.r, pilot.y + pilot.vy * dt));
    pilot.lean += ((pilot.vx / VESSEL.topSpeed) * 0.45 - pilot.lean) * Math.min(1, 10 * dt);
    if (Math.hypot(pilot.vx, pilot.vy) > 120 && Math.random() < 0.6) {
      fx.wake(pilot.x, pilot.y + 16, HUES[pilot.hue].core);
    }
  }

  function restart() {
    state.pilot.x = VESSEL.homeX;
    state.pilot.y = VESSEL.homeY;
    state.pilot.vx = 0;
    state.pilot.vy = 0;
    state.pilot.hue = 0;
    state.pilot.lean = 0;
    state.drops.length = 0;
    state.rocks.length = 0;
    state.gifts.length = 0;
    state.points = 0;
    state.chain = 0;
    state.bestChain = 0;
    state.boost = 1;
    state.hearts = PLAY.hearts;
    state.stage = 1;
    state.clock = 0;
    state.slowTill = 0;
    state.safeTill = 0;
    state.tremor = 0;
    state.flare = 0;
    state.flag = null;
    state.done = false;
    dropTimer = 0.4;
    giftTimer = PLAY.giftEverySeconds;
    drift = 0;
  }

  /** Advance one fixed step. In demo mode (title screen) the ship cruises on its
   * own, orbs are gathered harmlessly and nothing can hurt it. */
  function advance(dt, steer, demo) {
    let events = 0;
    state.clock += dt;
    const stage = 1 + Math.floor(state.clock / PLAY.stageSeconds);
    if (stage !== state.stage) {
      state.stage = stage;
      state.flag = { text: `WAVE ${stage}`, age: 0 };
      events |= EVT_STAGE;
    }
    if (state.flag) {
      state.flag.age += dt;
      if (state.flag.age > 2.2) state.flag = null;
    }
    state.tremor = Math.max(0, state.tremor - 40 * dt);
    state.flare = Math.max(0, state.flare - dt);

    const slow = state.clock < state.slowTill ? PLAY.slowFactor : 1;
    dropTimer -= dt;
    if (dropTimer <= 0) {
      const gap = Math.max(PLAY.spawnFloor, PLAY.spawnBase - state.stage * 0.05);
      dropTimer = gap * rng.between(0.7, 1.3);
      dropOne();
      // A third of the time a second item falls beside the first, so the sky
      // stays busy and the player keeps choosing.
      if (rng.test(0.3)) dropOne();
    }
    giftTimer -= dt;
    if (giftTimer <= 0) {
      giftTimer = PLAY.giftEverySeconds * rng.between(0.8, 1.25);
      releaseGift();
    }

    if (demo) {
      drift += dt;
      state.pilot.x = ARENA.width / 2 + Math.sin(drift * 0.5) * 260;
      state.pilot.y = ARENA.height - 150 + Math.sin(drift * 0.9) * 40;
      state.pilot.lean = Math.cos(drift * 0.5) * 0.25;
    } else {
      steerPilot(dt, steer);
    }

    for (let i = state.drops.length - 1; i >= 0; i -= 1) {
      const drop = state.drops[i];
      drop.angle += drop.spin * dt;
      drop.y += drop.vy * slow * dt;
      drop.x = drop.homeX + Math.sin(state.clock * drop.swayRate + drop.swayPhase) * DROP.drift;
      if (drop.y - drop.r > ARENA.height) {
        state.drops.splice(i, 1);
        continue;
      }
      const dx = drop.x - state.pilot.x;
      const dy = drop.y - state.pilot.y;
      const reach = drop.r + VESSEL.r - 4;
      if (dx * dx + dy * dy < reach * reach) {
        if (demo) {
          state.drops.splice(i, 1);
          fx.spray(drop.x, drop.y, HUES[drop.hue].core, 10, 200);
        } else if (drop.hue === state.pilot.hue) {
          events |= takeDrop(drop, i);
        } else if (state.clock >= state.safeTill) {
          state.drops.splice(i, 1);
          state.tremor = PLAY.tremorOnMiss;
          state.flare = 0.25;
          fx.spray(drop.x, drop.y, '#ff4d5e', 18, 260);
          events |= hurtPilot(EVT_MISS);
          if (state.done) return events;
        }
        // A wrong orb that meets a blinking (invulnerable) ship passes through.
      }
    }

    for (let i = state.rocks.length - 1; i >= 0; i -= 1) {
      const rock = state.rocks[i];
      rock.y += rock.vy * slow * dt;
      rock.x += rock.vx * dt;
      rock.rotation += rock.spin * dt;
      if (rock.y - rock.r > ARENA.height + 20 || rock.x < -60 || rock.x > ARENA.width + 60) {
        state.rocks.splice(i, 1);
        continue;
      }
      if (demo) continue;
      const dx = rock.x - state.pilot.x;
      const dy = rock.y - state.pilot.y;
      const reach = rock.r * 0.85 + VESSEL.r - 6;
      if (dx * dx + dy * dy < reach * reach && state.clock >= state.safeTill) {
        state.rocks.splice(i, 1);
        events |= hurtPilot(EVT_SMASH);
        if (state.done) return events;
      }
    }

    for (let i = state.gifts.length - 1; i >= 0; i -= 1) {
      const gift = state.gifts[i];
      gift.phase += dt;
      gift.y += gift.vy * slow * dt;
      if (gift.y - gift.r > ARENA.height) {
        state.gifts.splice(i, 1);
        continue;
      }
      const dx = gift.x - state.pilot.x;
      const dy = gift.y - state.pilot.y;
      const reach = gift.r + VESSEL.r;
      if (dx * dx + dy * dy < reach * reach) {
        state.gifts.splice(i, 1);
        events |= useGift(gift);
      }
    }

    fx.tick(dt);
    return events;
  }

  restart();
  return {
    state,
    restart,
    advance,
    /** The player's colour actions, shared by the live game and the autopilot. */
    setPilotHue(index) {
      state.pilot.hue = ((index % HUES.length) + HUES.length) % HUES.length;
    },
    cyclePilotHue() {
      state.pilot.hue = (state.pilot.hue + 1) % HUES.length;
    },
  };
}
