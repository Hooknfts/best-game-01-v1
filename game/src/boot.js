// Boot and the one loop: input is read every frame, the simulation advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// painter paints what is there. The game moves between four views: title,
// play, paused and game over.
//
// ?seed=N fixes the falling pattern. ?shot=title|action|surge|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, TICK } from './tuning.js';
import { makeRng } from './rng.js';
import { makeSound } from './sound.js';
import { makeSim, EVT_END, EVT_GIFT, EVT_MISS, EVT_SMASH, EVT_STAGE, EVT_TAKE } from './simulation.js';
import { SIG_CYCLE, SIG_MUTE, SIG_PAUSE, SIG_START, makeControls } from './controls.js';
import { makePainter, VIEW_OVER, VIEW_PAUSED, VIEW_PLAY, VIEW_TITLE } from './painter.js';
import { stageScene } from './staging.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sim = makeSim(makeRng(seed));
const painter = makePainter(canvas);
const sound = makeSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function showScene(name) {
  const scene = stageScene(name, sim);
  // A read-only handle for automated play-testing; it changes nothing about play.
  window.__prism = { world: sim, screen: () => scene.view, best: () => scene.best };
  let painted = 0;
  function paint() {
    painter.paint(sim.state, scene.view, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function playGame() {
  const controls = makeControls(canvas);
  let view = VIEW_TITLE;
  let best = readBest();
  let leftover = 0;
  let last = performance.now();

  // A read-only handle for automated play-testing; it changes nothing about play.
  window.__prism = { world: sim, screen: () => view, best: () => best };

  // Screen readers (and anyone watching the page's text) hear the view changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function launch() {
    sound.wake();
    sound.fanfare();
    sim.restart();
    leftover = 0;
    view = VIEW_PLAY;
    announce(`Playing. 3 hearts. Match your ship's colour to the orbs.`);
  }

  function finish() {
    view = VIEW_OVER;
    sound.dirge();
    if (sim.state.points > best) {
      best = sim.state.points;
      saveBest(best);
    }
    announce(`Game over. Score ${sim.state.points}. Best ${best}. Press Space to fly again.`);
  }

  function handleSignals() {
    const signals = controls.drainSignals();
    const chosen = controls.drainPick();
    if (chosen >= 0 && view === VIEW_PLAY) sim.setPilotHue(chosen);
    if (signals & SIG_MUTE) {
      sound.wake();
      announce(sound.flipMute() ? 'Sound off.' : 'Sound on.');
    }
    if (signals & SIG_START && (view === VIEW_TITLE || view === VIEW_OVER)) {
      sound.wake();
      launch();
      return;
    }
    if (signals & SIG_CYCLE && view === VIEW_PLAY) {
      sound.wake();
      sim.cyclePilotHue();
    }
    if (signals & SIG_PAUSE && view === VIEW_PLAY) {
      view = VIEW_PAUSED;
      announce('Paused.');
    } else if (signals & (SIG_PAUSE | SIG_START) && view === VIEW_PAUSED) {
      view = VIEW_PLAY;
      announce('Playing.');
    }
  }

  function tickWorld() {
    if (view === VIEW_TITLE) {
      sim.advance(TICK, { ax: 0, ay: 0, mx: null, my: null }, true);
      return;
    }
    const events = sim.advance(TICK, controls.readSteer(), false);
    if (events & EVT_TAKE) sound.chime(sim.state.chain);
    if (events & EVT_MISS) sound.buzz();
    if (events & EVT_SMASH) sound.thud();
    if (events & EVT_GIFT) sound.arp();
    if (events & EVT_STAGE) sound.rise();
    if (events & EVT_END) finish();
    else if (events & (EVT_MISS | EVT_SMASH)) {
      announce(sim.state.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${sim.state.hearts} hearts left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    leftover += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleSignals();
    if (view === VIEW_TITLE || view === VIEW_PLAY) {
      while (leftover >= TICK && (view === VIEW_TITLE || view === VIEW_PLAY)) {
        tickWorld();
        leftover -= TICK;
      }
    } else {
      leftover = 0;
    }
    painter.paint(sim.state, view, best);
  }

  // Leaving the tab pauses a running game rather than letting rocks fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && view === VIEW_PLAY) {
      view = VIEW_PAUSED;
      announce('Paused.');
    }
  });

  announce('Prism Drift. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) showScene(shot);
else playGame();
