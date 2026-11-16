// Prism Drift — painter. Everything the player sees: the ship, the orbs,
// the rocks, the gifts, the HUD, the title screen, the pause veil and the
// game-over screen. It reads the state and draws it; it never changes it.

import { PALETTE, PRISM_COLOURS, SHIP, VIEW } from './tuning.js';
import { MODE } from './simulation.js';
import { drawBackground, drawFloats, drawParticles, glowCircle, glowRing } from './fx.js';

/** Draw one frame. `time` is the wall-clock seconds for twinkles and pulses. */
export function draw(ctx, state, time) {
  ctx.save();
  // Screen shake on a hit: a small random offset that decays with shakeTime.
  if (state.shake > 0) {
    const mag = state.shake * (state.shakeTime > 0 ? 1 : 0);
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  drawBackground(ctx, state, time);
  drawField(ctx, state, time);
  drawShip(ctx, state, time);
  drawParticles(ctx, state);
  drawFloats(ctx, state);
  ctx.restore();

  drawHud(ctx, state);
  if (state.banner !== null) drawBanner(ctx, state);
  if (state.mode === MODE.TITLE) drawTitle(ctx, state, time);
  if (state.mode === MODE.PAUSED) drawPaused(ctx, state);
  if (state.mode === MODE.OVER) drawGameOver(ctx, state, time);
}

/** Orbs, rocks and gifts, each in its own style. */
function drawField(ctx, state, time) {
  for (const orb of state.orbs) {
    const colour = PRISM_COLOURS[orb.colour];
    const pulse = 1 + Math.sin(time * 5 + orb.phase) * 0.08;
    glowCircle(ctx, orb.x, orb.y, orb.radius * pulse, colour.main, colour.glow);
    // A bright core so a matching orb reads at a glance.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(orb.x - orb.radius * 0.25, orb.y - orb.radius * 0.25, orb.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const rock of state.rocks) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.shadowColor = 'rgba(160, 160, 180, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#5b5b6e';
    ctx.strokeStyle = '#8b8ba3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // A rough hexagon: a rock, not a gem.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = rock.radius * (i % 2 === 0 ? 1 : 0.78);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  for (const gift of state.gifts) {
    const bob = Math.sin(time * 3 + gift.phase) * 3;
    glowRing(ctx, gift.x, gift.y + bob, 14, '#4ade80', 'rgba(74, 222, 128, 0.6)', 3);
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', gift.x, gift.y + bob + 1);
  }
}

/** The player's ship: a glowing triangle in its current colour, tilted by steering. */
function drawShip(ctx, state, time) {
  if (state.mode === MODE.OVER) return;
  const ship = state.ship;
  const colour = PRISM_COLOURS[ship.colour];
  // The shield blink: the ship flashes while it is protected after a hit.
  if (ship.shield > 0 && Math.floor(time * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.tilt);
  ctx.shadowColor = colour.glow;
  ctx.shadowBlur = 22;
  ctx.fillStyle = colour.main;
  ctx.beginPath();
  ctx.moveTo(SHIP.radius + 6, 0);
  ctx.lineTo(-SHIP.radius * 0.8, SHIP.radius * 0.85);
  ctx.lineTo(-SHIP.radius * 0.45, 0);
  ctx.lineTo(-SHIP.radius * 0.8, -SHIP.radius * 0.85);
  ctx.closePath();
  ctx.fill();
  // The cockpit dot, in the next colour of the cycle: a hint at what SPACE does.
  const next = PRISM_COLOURS[(ship.colour + 1) % PRISM_COLOURS.length];
  ctx.shadowBlur = 0;
  ctx.fillStyle = next.main;
  ctx.beginPath();
  ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The shield ring while protected.
  if (ship.shield > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(time * 10);
    glowRing(ctx, ship.x, ship.y, SHIP.radius + 12, '#ffffff', 'rgba(255, 255, 255, 0.4)', 2);
    ctx.restore();
  }
}

/** The HUD: score and best top-left, wave top-centre, hearts top-right, combo bottom-centre. */
function drawHud(ctx, state) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'left';
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, 28, 46);
  ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`BEST ${state.best.toLocaleString('en-US')}`, 28, 72);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${state.wave}`, VIEW.width / 2, 44);

  // Hearts, top-right: filled for lives left, dim outlines for lost ones.
  const heartY = 34;
  for (let i = 0; i < 3; i++) {
    const x = VIEW.width - 40 - i * 38;
    drawHeart(ctx, x, heartY, 13, i < state.hearts ? PALETTE.heartFull : PALETTE.heartEmpty);
  }

  // The combo meter, bottom-centre, only while a combo is running.
  if (state.mode === 'playing' && state.combo > 1) {
    const label = `COMBO x${state.combo}`;
    ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
    const w = ctx.measureText(label).width;
    const cx = VIEW.width / 2;
    ctx.fillStyle = 'rgba(10, 6, 26, 0.55)';
    roundRect(ctx, cx - w / 2 - 16, VIEW.height - 62, w + 32, 40, 10);
    ctx.fill();
    ctx.fillStyle = PRISM_COLOURS[state.ship.colour].main;
    ctx.fillText(label, cx, VIEW.height - 34);
  }

  // The current colour, bottom-left, so the player always knows what matches.
  if (state.mode === 'playing' || state.mode === 'paused') {
    const colour = PRISM_COLOURS[state.ship.colour];
    ctx.textAlign = 'left';
    ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('SHIP', 28, VIEW.height - 44);
    glowCircle(ctx, 62, VIEW.height - 26, 11, colour.main, colour.glow);
    ctx.fillStyle = colour.main;
    ctx.fillText(colour.name.toUpperCase(), 82, VIEW.height - 20);
  }
}

/** A heart shape at (x, y), scaled by `size`. */
function drawHeart(ctx, x, y, size, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-6, -4, -11, 2, 0, 9);
  ctx.bezierCurveTo(11, 2, 6, -4, 0, 3);
  ctx.fill();
  ctx.restore();
}

/** A filled rounded rectangle path, for HUD pills and panels. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A wave announcement, fading in the centre of the screen. */
function drawBanner(ctx, state) {
  const banner = state.banner;
  const alpha = Math.min(1, banner.t / 0.5, (2.2 - banner.t) / 0.4 + 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 54px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(255, 46, 166, 0.7)';
  ctx.shadowBlur = 26;
  ctx.fillText(banner.text, VIEW.width / 2, VIEW.height / 2 - 60);
  ctx.shadowBlur = 0;
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(banner.sub, VIEW.width / 2, VIEW.height / 2 - 24);
  ctx.restore();
}

/** The title screen: the name, the rules, the controls, the start prompt. */
function drawTitle(ctx, state, time) {
  veil(ctx, 0.42);
  const cx = VIEW.width / 2;
  const pulse = 1 + Math.sin(time * 2.4) * 0.03;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.translate(cx, 190);
  ctx.scale(pulse, pulse);
  ctx.font = '800 84px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(255, 46, 166, 0.8)';
  ctx.shadowBlur = 34;
  const titleGradient = ctx.createLinearGradient(-260, 0, 260, 0);
  titleGradient.addColorStop(0, '#ff2ea6');
  titleGradient.addColorStop(0.5, '#22d3ee');
  titleGradient.addColorStop(1, '#fbbf24');
  ctx.fillStyle = titleGradient;
  ctx.fillText('PRISM DRIFT', 0, 0);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText('Absorb orbs that match your ship. Dodge the rest.', cx, 268);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Wrong colour or grey rock costs a heart. Chain matches for a combo up to x8.', cx, 300);
  ctx.fillText('A green + gift restores one heart. Waves get faster and denser.', cx, 328);

  // The three colours, as a legend.
  const legendY = 392;
  PRISM_COLOURS.forEach((colour, i) => {
    const x = cx - 130 + i * 130;
    glowCircle(ctx, x - 52, legendY - 6, 11, colour.main, colour.glow);
    ctx.fillStyle = colour.main;
    ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(colour.name.toUpperCase(), x - 32, legendY);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('STEER  arrows / WASD / mouse      COLOUR  SPACE or click      PAUSE  P      MUTE  M', cx, 452);

  const blink = 0.55 + 0.45 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS SPACE TO START', cx, 540);
  ctx.globalAlpha = 1;

  if (state.best > 0) {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST ${state.best.toLocaleString('en-US')}`, cx, 584);
  }
}

/** The pause veil: a dim panel with a single line. */
function drawPaused(ctx) {
  veil(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 48px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 8);
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('press P to resume', VIEW.width / 2, VIEW.height / 2 + 32);
}

/** The game-over screen: SIGNAL LOST, the run's numbers, the restart prompt. */
function drawGameOver(ctx, state, time) {
  veil(ctx, 0.5);
  const cx = VIEW.width / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '800 72px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(255, 77, 109, 0.8)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff4d6d';
  ctx.fillText('SIGNAL LOST', cx, 220);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, cx, 310);
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`BEST ${state.best.toLocaleString('en-US')}    •    TOP COMBO x${state.topCombo}    •    WAVE ${state.wave}`, cx, 356);

  const blink = 0.55 + 0.45 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS SPACE TO FLY AGAIN', cx, 440);
  ctx.globalAlpha = 1;
}

/** A full-screen dim, so a menu reads over the field behind it. */
function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(5, 3, 15, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
