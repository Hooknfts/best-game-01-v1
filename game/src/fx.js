// Prism Drift — effects. The small visual helpers the painter leans on:
// the drifting starfield, the nebula wash, glowing circles, particles and
// floating score text. Nothing here knows about the rules; it only draws.

import { PALETTE, STARS, VIEW } from './tuning.js';

/** The deep-space backdrop: vertical gradient, three soft nebula blobs, stars. */
export function drawBackground(ctx, state, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  gradient.addColorStop(0, PALETTE.backgroundTop);
  gradient.addColorStop(1, PALETTE.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Slow-breathing nebula blobs, fixed in place.
  const blobs = [
    { x: 240, y: 150, r: 260, colour: PALETTE.nebulaMagenta, drift: 0.11 },
    { x: 1020, y: 560, r: 300, colour: PALETTE.nebulaCyan, drift: 0.09 },
    { x: 900, y: 110, r: 200, colour: PALETTE.nebulaAmber, drift: 0.13 },
  ];
  for (const blob of blobs) {
    const pulse = 1 + Math.sin(time * blob.drift) * 0.08;
    const wash = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r * pulse);
    wash.addColorStop(0, blob.colour);
    wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
  }

  // Stars: twinkle by phase, drift left in their layer's speed.
  for (const star of state.stars) {
    const def = STARS[star.layer];
    const twinkle = 0.65 + 0.35 * Math.sin(time * 2 + star.phase);
    ctx.globalAlpha = def.alpha * twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(star.x, star.y, def.size, def.size);
  }
  ctx.globalAlpha = 1;
}

/** A filled circle with a soft coloured halo around it. */
export function glowCircle(ctx, x, y, radius, colour, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A ring (stroke only) with a halo, used for rocks and gifts. */
export function glowRing(ctx, x, y, radius, colour, glow, width = 3) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** All live particles, fading out over their remaining life. */
export function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Rising score labels, fading as they climb. */
export function drawFloats(ctx, state) {
  ctx.textAlign = 'center';
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.colour;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
