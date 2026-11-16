// A tiny seeded generator (splitmix32) so a screenshot seed always replays the
// same sky, the same falling pattern and the same frame.
export function makeRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    z ^= z >>> 16;
    return (z >>> 0) / 4294967296;
  }

  return {
    next,
    between(lo, hi) {
      return lo + next() * (hi - lo);
    },
    choice(list) {
      return list[Math.floor(next() * list.length)];
    },
    test(p) {
      return next() < p;
    },
  };
}
