// Prism Drift: every tunable number and the whole palette lives here, so the
// rest of the game reads as rules rather than magic numbers.
export const ARENA = { width: 1280, height: 720 };
export const TICK = 1 / 60;

export const HUES = [
  { label: 'AMBER', core: '#ffb02e', halo: '#ffcf6b', shade: '#7a4d00' },
  { label: 'CYAN', core: '#2ee6ff', halo: '#8ff2ff', shade: '#00596b' },
  { label: 'MAGENTA', core: '#ff4fd8', halo: '#ff9cec', shade: '#6b004f' },
];

export const INK = {
  skyTop: '#0b0620',
  skyMid: '#1a0b33',
  skyLow: '#2d1150',
  hud: '#f4f0ff',
  hudSoft: '#b9a8e8',
  heart: '#ff5d7a',
  rock: '#9aa0b5',
  rockShade: '#5d6378',
  giftHeart: '#7dff9b',
  giftSlow: '#8fb7ff',
  giftNova: '#ffe95d',
  alarm: '#ff4d5e',
};

export const VESSEL = {
  r: 20,
  thrust: 2600,
  topSpeed: 560,
  drag: 3.2,
  homeX: ARENA.width / 2,
  homeY: ARENA.height - 130,
};

export const DROP = { r: 15, fall: 110, fallPerStage: 16, drift: 42 };

export const ROCK = { minR: 18, maxR: 34, fall: 130, fallPerStage: 14 };

export const PLAY = {
  hearts: 3,
  maxHearts: 4,
  stageSeconds: 25,
  spawnBase: 0.55,
  spawnFloor: 0.22,
  rockChance: 0.12,
  rockChancePerStage: 0.04,
  giftEverySeconds: 14,
  chainStep: 5,
  maxBoost: 8,
  pointsEach: 10,
  slowSeconds: 6,
  slowFactor: 0.5,
  tremorOnSmash: 14,
  tremorOnMiss: 9,
};

export const BEST_KEY = 'prism-drift-best';
