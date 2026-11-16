// Sparks, bursts and floating score popups: short-lived, drawn additively, and
// the only thing the simulation spawns for pure feedback.
export function makeFx() {
  const embers = [];
  const labels = [];

  function fade(list, dt, onAge) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      item.age += dt;
      onAge(item, dt);
      if (item.age >= item.life) list.splice(i, 1);
    }
  }

  return {
    spray(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.3 + Math.random() * 0.7);
        embers.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 0.45 + Math.random() * 0.35,
          age: 0,
          size: 2 + Math.random() * 3.5,
          color,
        });
      }
    },
    wake(x, y, color) {
      embers.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: 40 + Math.random() * 40,
        life: 0.35,
        age: 0,
        size: 2.5,
        color,
      });
    },
    float(x, y, text, color) {
      labels.push({ x, y, text, color, life: 0.9, age: 0 });
    },
    tick(dt) {
      fade(embers, dt, (ember) => {
        ember.x += ember.vx * dt;
        ember.y += ember.vy * dt;
        ember.vx *= 1 - 2.4 * dt;
        ember.vy *= 1 - 2.4 * dt;
      });
      fade(labels, dt, (label) => {
        label.y -= 46 * dt;
      });
    },
    get embers() {
      return embers;
    },
    get labels() {
      return labels;
    },
  };
}
