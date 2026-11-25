// Boot and the single loop: input is read each frame, the world advances in fixed 1/60 s steps
// (a few in a slow frame, none in a fast one), and the renderer paints what is there. The game is
// one continuous shift: serve the orders, watch the clock, and finish before the timer runs out.
//
// ?seed=N fixes the shift. ?shot=kitchen|preparing|cooking|serving (with &seed=N) stages that
// scene instead of playing, paints it twice and sets window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { PANTRY_ORDER } from './recipes.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const world = createWorld(seed);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.ready);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let cursorInField = null;

  function restart() {
    world.reset();
    accumulator = 0;
  }

  window.addEventListener('keydown', (event) => {
    if ((event.code === 'Enter' || event.code === 'Space') && world.state.shiftOver) {
      restart();
      event.preventDefault();
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    // Pointer position in field coordinates, for the held-ingredient cursor.
    const cursor = input.cursor();
    if (cursor.over) cursorInField = renderer.toField(cursor.clientX, cursor.clientY);

    // Clicks run the station under them; the digit keys grab a pantry ingredient directly.
    for (const click of input.takeClicks()) {
      const p = renderer.toField(click.clientX, click.clientY);
      if (world.state.shiftOver) {
        restart();
        continue;
      }
      world.interact(p.x, p.y);
    }
    for (const index of input.takeKeys()) {
      if (!world.state.shiftOver) world.grab(PANTRY_ORDER[index]);
    }

    // Advance the simulation in fixed steps.
    if (!world.state.shiftOver) {
      while (accumulator >= STEP) {
        world.step(STEP);
        accumulator -= STEP;
        if (world.state.shiftOver) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(world.state, world.ready(), cursorInField);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
