// Everything the eye sees: the nebula sky, the glowing orbs and rocks, the
// prism-ship, the particles, the HUD and the title / pause / game-over screens.
// One canvas, one logical field (1280x720), scaled to whatever window it gets.
import { ARENA, HUES, INK, VESSEL } from './tuning.js';
import { makeRng } from './rng.js';

export const VIEW_TITLE = 'title';
export const VIEW_PLAY = 'play';
export const VIEW_PAUSED = 'paused';
export const VIEW_OVER = 'over';

const GIFT_STYLE = {
  heart: { label: '+', color: INK.giftHeart },
  slow: { label: '◷', color: INK.giftSlow },
  nova: { label: '✦', color: INK.giftNova },
};

export function makePainter(canvas) {
  const ctx = canvas.getContext('2d');
  const sky = makeRng(20261116);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: sky.between(0, ARENA.width),
      y: sky.between(0, ARENA.height),
      size: sky.between(0.6, 2.4),
      twinkle: sky.between(0.5, 2.2),
      phase: sky.between(0, Math.PI * 2),
      depth: sky.between(0.3, 1),
    });
  }
  const clouds = [
    { x: 240, y: 180, r: 340, color: 'rgba(120, 60, 220, 0.20)' },
    { x: 1050, y: 420, r: 380, color: 'rgba(40, 140, 220, 0.16)' },
    { x: 700, y: 90, r: 260, color: 'rgba(255, 80, 180, 0.12)' },
    { x: 120, y: 620, r: 300, color: 'rgba(255, 150, 40, 0.10)' },
  ];
  // Slow-drifting glow motes: pure decoration, for depth behind the play.
  const motes = [];
  for (let i = 0; i < 14; i += 1) {
    motes.push({
      x: sky.between(0, ARENA.width),
      y: sky.between(0, ARENA.height),
      r: sky.between(3, 7),
      speed: sky.between(6, 18),
      color: sky.choice(['#ffb02e', '#2ee6ff', '#ff4fd8', '#8b5cff']),
      phase: sky.between(0, Math.PI * 2),
    });
  }

  function fitCanvas() {
    const scale = Math.min(window.innerWidth / ARENA.width, window.innerHeight / ARENA.height);
    canvas.width = Math.floor(ARENA.width * scale * window.devicePixelRatio);
    canvas.height = Math.floor(ARENA.height * scale * window.devicePixelRatio);
    canvas.style.width = `${Math.floor(ARENA.width * scale)}px`;
    canvas.style.height = `${Math.floor(ARENA.height * scale)}px`;
  }

  function paintSky(clock) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
    gradient.addColorStop(0, INK.skyTop);
    gradient.addColorStop(0.55, INK.skyMid);
    gradient.addColorStop(1, INK.skyLow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    for (const cloud of clouds) {
      const glow = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
      glow.addColorStop(0, cloud.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cloud.x - cloud.r, cloud.y - cloud.r, cloud.r * 2, cloud.r * 2);
    }
    for (const star of stars) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(clock * star.twinkle + star.phase));
      ctx.globalAlpha = alpha * star.depth;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const mote of motes) {
      const y = (mote.y + clock * mote.speed) % ARENA.height;
      const alpha = 0.10 + 0.08 * Math.sin(clock * 0.8 + mote.phase);
      ctx.globalAlpha = Math.max(0.04, alpha);
      ctx.fillStyle = mote.color;
      ctx.shadowColor = mote.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mote.x, y, mote.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function paintDrop(drop) {
    const hue = HUES[drop.hue];
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(drop.angle);
    // A short motion streak above the orb, fading into the sky.
    const streak = ctx.createLinearGradient(0, -46, 0, 0);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(1, hue.core);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = streak;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(0, -drop.r);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = hue.core;
    ctx.shadowBlur = 26;
    ctx.fillStyle = hue.core;
    ctx.beginPath();
    ctx.arc(0, 0, drop.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hue.halo;
    ctx.beginPath();
    ctx.arc(0, 0, drop.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, drop.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintRock(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rotation);
    ctx.fillStyle = INK.rock;
    ctx.strokeStyle = INK.rockShade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rock.corners.forEach((corner, index) => {
      const x = Math.cos(corner.angle) * corner.r;
      const y = Math.sin(corner.angle) * corner.r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK.rockShade;
    ctx.beginPath();
    ctx.arc(-rock.r * 0.25, -rock.r * 0.2, rock.r * 0.22, 0, Math.PI * 2);
    ctx.arc(rock.r * 0.3, rock.r * 0.25, rock.r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintGift(gift) {
    const style = GIFT_STYLE[gift.kind];
    const bob = Math.sin(gift.phase * 3) * 3;
    ctx.save();
    ctx.translate(gift.x, gift.y + bob);
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(10, 8, 30, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, gift.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, gift.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = style.color;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.label, 0, 1);
    ctx.restore();
  }

  function paintPilot(pilot, clock, safeTill) {
    const hue = HUES[pilot.hue];
    ctx.save();
    ctx.translate(pilot.x, pilot.y);
    ctx.rotate(pilot.lean);
    // A ship in its grace second after a hit blinks, so the player can see it.
    if (clock < safeTill) ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(clock * 18));
    const speed = Math.hypot(pilot.vx, pilot.vy);
    if (speed > 60) {
      const flame = 14 + Math.sin(clock * 40) * 5 + speed * 0.02;
      const flameGradient = ctx.createLinearGradient(0, 14, 0, 14 + flame);
      flameGradient.addColorStop(0, hue.halo);
      flameGradient.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = flameGradient;
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(0, 14 + flame);
      ctx.lineTo(8, 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowColor = hue.core;
    ctx.shadowBlur = 26;
    const bodyGradient = ctx.createLinearGradient(0, -24, 0, 18);
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.45, hue.halo);
    bodyGradient.addColorStop(1, hue.core);
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(19, 16);
    ctx.lineTo(0, 8);
    ctx.lineTo(-19, 16);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = hue.shade;
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintFx(fx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ember of fx.embers) {
      ctx.globalAlpha = 1 - ember.age / ember.life;
      ctx.fillStyle = ember.color;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const label of fx.labels) {
      ctx.globalAlpha = 1 - label.age / label.life;
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, label.x, label.y);
    }
    ctx.globalAlpha = 1;
  }

  function paintHud(state, best) {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK.hud;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 28, 44);
    ctx.font = '800 46px system-ui, sans-serif';
    ctx.fillText(String(state.points), 28, 92);
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = INK.hudSoft;
    ctx.fillText(`BEST ${Math.max(best, state.points)}`, 28, 120);

    if (state.chain >= 2) {
      const pulse = 1 + Math.sin(state.clock * 8) * 0.06;
      ctx.save();
      ctx.translate(28, 158);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = HUES[state.pilot.hue].core;
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`×${state.boost}  COMBO ${state.chain}`, 0, 0);
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = INK.hud;
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.stage}`, ARENA.width / 2, 44);
    if (state.clock < state.slowTill) {
      ctx.fillStyle = INK.giftSlow;
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillText(`SLOW TIME ${Math.ceil(state.slowTill - state.clock)}s`, ARENA.width / 2, 72);
    }

    for (let i = 0; i < state.hearts; i += 1) {
      const x = ARENA.width - 40 - i * 40;
      const y = 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = INK.heart;
      ctx.shadowColor = INK.heart;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-14, -2, -8, -14, 0, -6);
      ctx.bezierCurveTo(8, -14, 14, -2, 0, 10);
      ctx.fill();
      ctx.restore();
    }

    const hue = HUES[state.pilot.hue];
    ctx.textAlign = 'right';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillStyle = hue.core;
    ctx.fillText(`◉ ${hue.label}  —  SPACE / CLICK to switch`, ARENA.width - 28, ARENA.height - 24);
    ctx.fillStyle = INK.hudSoft;
    ctx.textAlign = 'left';
    ctx.fillText('ARROWS / WASD / MOUSE to fly   ·   P pause   ·   M mute', 28, ARENA.height - 24);
  }

  function paintFlag(flag) {
    if (!flag) return;
    const alpha = flag.age < 0.3 ? flag.age / 0.3 : flag.age > 1.7 ? Math.max(0, (2.2 - flag.age) / 0.5) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = '800 72px system-ui, sans-serif';
    ctx.shadowColor = '#8b5cff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(flag.text, ARENA.width / 2, ARENA.height / 2 - 40);
    ctx.restore();
  }

  function shade(alpha) {
    ctx.fillStyle = `rgba(6, 3, 18, ${alpha})`;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  function stacked(lines, startY, gap) {
    ctx.textAlign = 'center';
    lines.forEach((line, index) => {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      if (line.glow) {
        ctx.shadowColor = line.glow;
        ctx.shadowBlur = 24;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillText(line.text, ARENA.width / 2, startY + index * gap);
    });
    ctx.shadowBlur = 0;
  }

  function paintTitle(state, best) {
    shade(0.45);
    const pulse = 0.75 + Math.sin(state.clock * 2.4) * 0.25;
    const titleGradient = ctx.createLinearGradient(ARENA.width / 2 - 320, 0, ARENA.width / 2 + 320, 0);
    titleGradient.addColorStop(0, HUES[0].core);
    titleGradient.addColorStop(0.5, HUES[1].core);
    titleGradient.addColorStop(1, HUES[2].core);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 96px system-ui, sans-serif';
    ctx.shadowColor = '#8b5cff';
    ctx.shadowBlur = 36;
    ctx.fillStyle = titleGradient;
    ctx.fillText('PRISM DRIFT', ARENA.width / 2, 250);
    ctx.restore();
    stacked(
      [
        { text: 'Ride the light. Dodge the dark.', font: '600 28px system-ui, sans-serif', color: '#e8e0ff' },
        { text: 'Absorb orbs that match your ship’s colour — wrong colours and rocks cost a heart.', font: '500 21px system-ui, sans-serif', color: '#c9bdf0' },
        { text: 'Chain matches into combos up to ×8. Survive the rising waves.', font: '500 21px system-ui, sans-serif', color: '#c9bdf0' },
        { text: 'ARROWS / WASD / MOUSE — fly      SPACE / CLICK — switch colour      1 2 3 — pick colour', font: '600 19px system-ui, sans-serif', color: '#9d8bd6' },
      ],
      310,
      38,
    );
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.textAlign = 'center';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS SPACE OR CLICK TO START', ARENA.width / 2, 500);
    ctx.restore();
    if (best > 0) {
      ctx.textAlign = 'center';
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillStyle = INK.hudSoft;
      ctx.fillText(`BEST SCORE  ${best}`, ARENA.width / 2, 548);
    }
  }

  function paintPaused() {
    shade(0.55);
    stacked(
      [
        { text: 'PAUSED', font: '800 64px system-ui, sans-serif', color: '#ffffff', glow: '#8b5cff' },
        { text: 'Press P or Space to keep flying', font: '500 24px system-ui, sans-serif', color: '#c9bdf0' },
      ],
      330,
      52,
    );
  }

  function paintOver(state, best) {
    shade(0.62);
    const isBest = state.points >= best && state.points > 0;
    stacked(
      [
        { text: 'SIGNAL LOST', font: '800 76px system-ui, sans-serif', color: '#ff5d7a', glow: '#ff2e4d' },
        { text: isBest ? '★ NEW BEST SCORE ★' : 'The nebula claims another pilot.', font: '700 26px system-ui, sans-serif', color: isBest ? '#ffe95d' : '#c9bdf0' },
        { text: `SCORE  ${state.points}`, font: '800 52px system-ui, sans-serif', color: '#ffffff' },
        { text: `BEST  ${best}      ·      WAVE ${state.stage}      ·      TOP COMBO ${state.bestChain}`, font: '600 22px system-ui, sans-serif', color: '#b9a8e8' },
        { text: 'PRESS SPACE OR CLICK TO FLY AGAIN', font: '800 26px system-ui, sans-serif', color: '#ffffff' },
      ],
      240,
      62,
    );
  }

  function paint(state, view, best) {
    fitCanvas();
    const scale = canvas.width / ARENA.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.tremor > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.tremor, (Math.random() - 0.5) * state.tremor);
    }
    paintSky(state.clock);
    for (const drop of state.drops) paintDrop(drop);
    for (const rock of state.rocks) paintRock(rock);
    for (const gift of state.gifts) paintGift(gift);
    if (view !== VIEW_OVER || !state.done) paintPilot(state.pilot, state.clock, state.safeTill);
    paintFx(state.fx);
    if (state.flare > 0) {
      ctx.fillStyle = `rgba(255, 60, 80, ${state.flare * 0.5})`;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    }
    if (view === VIEW_TITLE) {
      paintHud(state, best);
      paintTitle(state, best);
    } else if (view === VIEW_PLAY) {
      paintHud(state, best);
      paintFlag(state.flag);
    } else if (view === VIEW_PAUSED) {
      paintHud(state, best);
      paintPaused();
    } else if (view === VIEW_OVER) {
      paintHud(state, best);
      paintOver(state, best);
    }
  }

  return { paint };
}
