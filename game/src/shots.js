// The screenshot scenes behind ?shot=kitchen|preparing|cooking|serving (with &seed=N). Each one
// drives the real world through its own rules to a fixed moment — a tomato mid-chop, a patty
// sizzling, a plate halfway built — so the frame is what a real game looks like and the same seed
// always gives the same frame. This file runs only when a shot is requested; normal play never
// touches it.
import { STEP } from './config.js';
import { RECIPES } from './recipes.js';

const CHOP = 0.7;
const COOK = 3.2;

function order(id, recipe, patience) {
  return { id, recipe, patience };
}

function fillOrders(world, specs) {
  world.state.orders = specs.map(([recipeId, patience], i) => order(100 + i, RECIPES.find((r) => r.id === recipeId), patience));
}

function step(world, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i += 1) world.step(STEP);
}

export function stageShot(name, world) {
  world.reset();
  let ready = false;

  if (name === 'preparing') {
    fillOrders(world, [['garden-salad', 30], ['cheeseburger', 22]]);
    // A lettuce leaf halfway through the knife.
    world.grab('lettuce');
    world.chop();
    step(world, CHOP * 0.55);
  } else if (name === 'cooking') {
    fillOrders(world, [['cheeseburger', 26], ['cheese-omelet', 18], ['tomato-soup', 31]]);
    // A ground patty and an egg, both sizzling, plus a prepared bun waiting on the plate.
    world.grab('patty');
    world.cook(0);
    world.grab('egg');
    world.cook(1);
    step(world, COOK * 0.62);
    world.grab('bun');
    world.plate();
  } else if (name === 'serving') {
    fillOrders(world, [['garden-salad', 14], ['cheeseburger', 28]]);
    // Build the full Garden Salad: chopped lettuce, tomato and onion on the plate.
    for (const type of ['lettuce', 'tomato', 'onion']) {
      world.grab(type);
      world.chop();
      step(world, CHOP * 1.06);
      world.chop(); // pick the finished piece up off the block
      world.plate();
    }
    ready = world.ready();
    step(world, 0.2);
  } else {
    // kitchen — the cover: everything at once. Orders waiting, a tomato mid-chop on the block,
    // a patty sizzling on the stove, and a burger bun and cheese already plated.
    fillOrders(world, [['cheeseburger', 29], ['garden-salad', 24], ['cheese-omelet', 20], ['tomato-soup', 33]]);
    world.grab('tomato');
    world.chop();
    step(world, CHOP * 0.5);
    world.grab('patty');
    world.cook(0);
    step(world, COOK * 0.5);
    world.grab('bun');
    world.plate();
    world.grab('cheese');
    world.plate();
    step(world, 0.3);
  }
  return { ready };
}
