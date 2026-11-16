// Prism Drift — tuning: every number that shapes how the game feels.
// One place for the palette, the ship, the orbs, the waves and the scoring,
// so a balance pass touches this file and nothing else.

export const VIEW = {
  width: 1280,
  height: 720,
};

export const PALETTE = {
  backgroundTop: '#150a2e',
  backgroundBottom: '#05030f',
  nebulaMagenta: 'rgba(255, 46, 166, 0.10)',
  nebulaCyan: 'rgba(34, 211, 238, 0.08)',
  nebulaAmber: 'rgba(251, 191, 36, 0.06)',
  hudText: '#f4f1ff',
  hudDim: '#a89fd6',
  heartFull: '#ff4d6d',
  heartEmpty: 'rgba(255, 255, 255, 0.16)',
};

// The three prism colours. Index order is the cycle order for SPACE / click.
export const PRISM_COLOURS = [
  { name: 'magenta', main: '#ff2ea6', glow: 'rgba(255, 46, 166, 0.55)', dark: '#a3126b' },
  { name: 'cyan', main: '#22d3ee', glow: 'rgba(34, 211, 238, 0.55)', dark: '#0e7490' },
  { name: 'amber', main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)', dark: '#92400e' },
];

export const SHIP = {
  radius: 16,
  accel: 2600,
  maxSpeed: 460,
  drag: 3.2,
  // Mouse steering: the ship eases toward the pointer this strongly per second.
  mousePull: 7.5,
  // Brief protection after taking a hit, in seconds.
  shieldSeconds: 1.4,
  // How far the ship may roam (it stays inside the view with this margin).
  margin: 26,
};

export const ORB = {
  radius: 15,
  // Base leftward drift speed, plus a per-orb random share of this.
  baseSpeed: 95,
  speedJitter: 70,
  // Gentle vertical wobble while an orb drifts.
  wobbleAmp: 26,
  wobbleFreq: 1.6,
  // Points for a matching absorb before the combo multiplier.
  basePoints: 10,
};

export const ROCK = {
  radius: 19,
  baseSpeed: 120,
  speedJitter: 60,
  // Rocks spin; the spin rate range in radians per second.
  spinMin: 0.6,
  spinMax: 2.2,
};

export const GIFT = {
  radius: 14,
  speed: 80,
  // A gift appears about this often, in seconds, once the run is going.
  everySeconds: 26,
};

export const COMBO = {
  max: 8,
  // Seconds without a matching absorb before the combo falls back to x1.
  windowSeconds: 4.5,
};

export const WAVES = {
  // Seconds each wave lasts before the next one rolls in.
  lengthSeconds: 22,
  // Orbs per second at wave 1, growing by this much each wave.
  spawnPerSecond: 1.15,
  spawnGrowth: 0.16,
  // Extra drift speed per wave.
  speedGrowth: 13,
  // Share of spawns that are rocks at wave 1, growing per wave, capped.
  rockShare: 0.16,
  rockGrowth: 0.035,
  rockCap: 0.42,
  // The first wave that may spawn a second orb beside the first.
  doubleFromWave: 3,
};

// Scoring and run shape.
export const RUN = {
  startHearts: 3,
  maxHearts: 3,
  // A wrong absorb or a rock hit costs one heart.
  hitCost: 1,
  // A gift restores one heart and pays this many points.
  giftPoints: 25,
};

// Particle and feedback feel.
export const FX = {
  absorbBurst: 16,
  hitBurst: 22,
  giftBurst: 14,
  // Screen shake strength on a hit, in pixels.
  shakePixels: 9,
  shakeSeconds: 0.28,
  // Floating score text rises this fast and lives this long.
  floatRise: 46,
  floatSeconds: 0.9,
};

// Starfield: three depth layers, each with its own count and drift.
export const STARS = [
  { count: 70, speed: 12, size: 1.2, alpha: 0.5 },
  { count: 46, speed: 26, size: 1.8, alpha: 0.75 },
  { count: 22, speed: 48, size: 2.6, alpha: 1.0 },
];
