// Prism Drift — seeded random numbers. Every random choice in the game flows
// through one of these helpers so a seeded run (screenshots, tests) plays the
// same way every time. Mulberry32 is small, fast and good enough for a game.

/** A mulberry32 generator: returns a float in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small random source built on one generator function. */
export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }

  /** Float in [0, 1). */
  float() {
    return this.next();
  }

  /** Float in [min, max). */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** One element of an array, uniformly. */
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
}

/** A seed from the page URL (?seed=7) or, when absent, from the clock. */
export function seedFromQuery(query) {
  const raw = Number.parseInt(query.get('seed') ?? '', 10);
  return Number.isFinite(raw) ? raw >>> 0 : (Date.now() % 2147483647) >>> 0;
}
