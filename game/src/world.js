// The simulation: every station, the orders coming in, the plate the player builds and the day
// clock, advanced in fixed steps. The world owns the rules and the state; drawing reads the state
// and never changes it. All randomness comes from the seeded generator, so a seed always replays
// the same shift.

import {
  SHIFT_SECONDS,
  PATIENCE_SECONDS,
  ORDER_INTERVAL_START,
  ORDER_INTERVAL_END,
  SCORE,
  STEP,
  LAYOUT,
} from './config.js';
import { INGREDIENTS, PANTRY_ORDER, RECIPES } from './recipes.js';
import { createRandom } from './random.js';

const CHOP_SECONDS = 0.7;
const COOK_SECONDS = 3.2;
const MAX_PLATE = 6;

/** A prepared ingredient: the type id plus which processes it has been through. */
export function makePiece(type) {
  return { type, chopped: false, cooked: false };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function initState() {
  return {
    shiftTime: SHIFT_SECONDS,
    score: 0,
    tips: 0,
    served: 0,
    lost: 0,
    streak: 0,
    nextOrder: 2.2,
    orderCounter: 1,
    orders: [],      // { id, recipe, patience }
    held: null,      // piece in the player's hand, or null
    board: null,     // { piece, progress } while a piece is chopped
    pans: [
      { piece: null, progress: 0, lit: false },
      { piece: null, progress: 0, lit: false },
    ],
    plate: [],       // pieces assembled, ready to serve
    particles: [],   // juice bits and steam, visual only
    message: null,   // { text, t, kind }
    hurt: null,      // a red flash over a wrong station, { t }
    shiftOver: false,
  };
}

export function createWorld(seed) {
  let random = createRandom(seed);
  const state = initState();

  function say(text, kind = 'info') {
    state.message = { text, t: 1.4, kind };
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const force = speed * (0.4 + random() * 0.6);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 30,
        life: 0.5 + random() * 0.4,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function spawnOrder() {
    const recipe = RECIPES[Math.floor(random() * RECIPES.length)];
    state.orders.push({ id: state.orderCounter += 1, recipe, patience: PATIENCE_SECONDS });
    return state.orders[state.orders.length - 1];
  }

  function orderInterval() {
    const t = 1 - state.shiftTime / SHIFT_SECONDS;
    return lerp(ORDER_INTERVAL_START, ORDER_INTERVAL_END, Math.min(1, t));
  }

  /** The pantry bin under a point, or null. */
  function pantryIndexAt(x, y) {
    const p = LAYOUT.pantry;
    if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) return null;
    const bin = (p.h - 20) / PANTRY_ORDER.length;
    const index = Math.floor((y - p.y - 10) / bin);
    return index >= 0 && index < PANTRY_ORDER.length ? index : null;
  }

  function inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  /** The two stove pans' rects (top, bottom). */
  function panRects() {
    const s = LAYOUT.stove;
    return [
      { x: s.x + 14, y: s.y + 16, w: s.w - 28, h: 120 },
      { x: s.x + 14, y: s.y + 160, w: s.w - 28, h: 120 },
    ];
  }

  function stationAt(x, y) {
    for (let i = 0; i < PANTRY_ORDER.length; i += 1) {
      if (pantryIndexAt(x, y) === i) return { kind: 'pantry', index: i };
    }
    if (inRect(x, y, LAYOUT.cutting)) return { kind: 'cutting' };
    if (inRect(x, y, LAYOUT.plate)) return { kind: 'plate' };
    if (inRect(x, y, LAYOUT.pass)) return { kind: 'pass' };
    const pans = panRects();
    for (let i = 0; i < pans.length; i += 1) {
      if (inRect(x, y, pans[i])) return { kind: 'stove', index: i };
    }
    return null;
  }

  function grab(type) {
    if (state.held) return;
    state.held = makePiece(type);
    say(`Picked up a ${INGREDIENTS[type].name}.`);
  }

  function chop() {
    const piece = state.held;
    if (!piece) {
      // Carry a finished chopped piece out of the block.
      if (state.board && state.board.progress >= 1) {
        state.held = state.board.piece;
        state.board = null;
      }
      return;
    }
    const ing = INGREDIENTS[piece.type];
    if (piece.cooked || !ing.chop) {
      state.hurt = { t: 0.5, at: 'cutting' };
      say(`The ${ing.name} doesn't need the knife.`, 'bad');
      return;
    }
    if (piece.chopped) return;
    state.board = { piece, progress: 0 };
    state.held = null;
  }

  function cook(index) {
    const piece = state.held;
    if (!piece) {
      const pan = state.pans[index];
      if (pan.piece && pan.progress >= 1) {
        state.held = pan.piece;
        pan.piece = null;
        pan.progress = 0;
        pan.lit = false;
      }
      return;
    }
    const ing = INGREDIENTS[piece.type];
    if (!ing.cook || piece.chopped) {
      state.hurt = { t: 0.5, at: 'stove' };
      say(`A ${ing.name} goes in the pan raw.`, 'bad');
      return;
    }
    if (piece.cooked) return;
    const pan = state.pans[index];
    if (pan.piece) return;
    pan.piece = piece;
    pan.progress = 0;
    pan.lit = true;
    state.held = null;
  }

  function plate() {
    const piece = state.held;
    if (!piece) return;
    if (state.plate.length >= MAX_PLATE) {
      say('The plate is full.', 'bad');
      return;
    }
    state.plate.push(piece);
    state.held = null;
    say('Plated.');
  }

  /** Does the plate hold exactly one recipe's set of prepared pieces? */
  function matchesRecipe(order) {
    const remaining = state.plate.map((p) => ({ ...p }));
    for (const step of order.recipe.steps) {
      const found = remaining.findIndex(
        (p) => p.type === step.type && p.chopped === (step.process === 'chopped') && p.cooked === (step.process === 'cooked'),
      );
      if (found === -1) return false;
      remaining.splice(found, 1);
    }
    return remaining.length === 0;
  }

  function findMatchingOrder() {
    for (const order of state.orders) {
      if (matchesRecipe(order)) return order;
    }
    return null;
  }

  function serve() {
    if (state.plate.length === 0) {
      say('Nothing to serve — build a plate first.', 'bad');
      return;
    }
    const order = findMatchingOrder();
    if (!order) {
      state.hurt = { t: 0.5, at: 'pass' };
      say('No order matches this plate.', 'bad');
      return;
    }
    const tip = Math.round(order.patience);
    const perfect = matchesRecipe(order) ? SCORE.perfect : 0;
    state.score += SCORE.serve + perfect + tip;
    state.tips += tip;
    state.served += 1;
    state.streak += 1;
    state.orders.splice(state.orders.indexOf(order), 1);
    state.plate.length = 0;
    burst(LAYOUT.pass.x + LAYOUT.pass.w / 2, LAYOUT.pass.y + 40, '#ffd76a', 12, 90);
    say(`Served! +${SCORE.serve + perfect + tip} (tip ${tip})`, 'good');
  }

  function interact(x, y) {
    const station = stationAt(x, y);
    if (!station) return;
    if (station.kind === 'pantry') grab(PANTRY_ORDER[station.index]);
    else if (station.kind === 'cutting') chop();
    else if (station.kind === 'stove') cook(station.index);
    else if (station.kind === 'plate') plate();
    else if (station.kind === 'pass') serve();
  }

  function update(dt) {
    if (state.shiftOver) return;

    state.shiftTime -= dt;
    if (state.shiftTime <= 0) {
      state.shiftTime = 0;
      state.shiftOver = true;
      return;
    }

    // New orders.
    state.nextOrder -= dt;
    if (state.nextOrder <= 0) {
      spawnOrder();
      state.nextOrder = orderInterval();
    }

    // Order patience; an empty patience loses the customer.
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.lost += 1;
        state.streak = 0;
        state.score = Math.max(0, state.score - SCORE.angerPenalty);
        say('A customer left angry!', 'bad');
      }
    }

    // Chopping on the block.
    if (state.board && state.board.progress < 1) {
      state.board.progress += dt / CHOP_SECONDS;
      if (state.board.progress >= 1) {
        state.board.piece.chopped = true;
        burst(
          LAYOUT.cutting.x + LAYOUT.cutting.w / 2,
          LAYOUT.cutting.y + 52,
          INGREDIENTS[state.board.piece.type].color,
          10,
          70,
        );
      }
    }

    // Cooking in the pans.
    const rects = panRects();
    for (let i = 0; i < state.pans.length; i += 1) {
      const pan = state.pans[i];
      if (pan.piece && pan.progress < 1) {
        pan.progress += dt / COOK_SECONDS;
        if (pan.progress >= 1) {
          pan.piece.cooked = true;
          pan.lit = false;
          const r = rects[i];
          for (let k = 0; k < 4; k += 1) {
            state.particles.push({
              x: r.x + r.w / 2 + (random() - 0.5) * 40,
              y: r.y - 8 - random() * 12,
              vx: (random() - 0.5) * 8,
              vy: -28 - random() * 18,
              life: 0.9,
              color: '#ffffff',
              size: 3 + random() * 3,
              steam: true,
            });
          }
        }
      }
    }

    // Particles.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.steam) p.vy += 220 * dt;
    }

    // Transient messages.
    if (state.message) {
      state.message.t -= dt;
      if (state.message.t <= 0) state.message = null;
    }
    if (state.hurt) {
      state.hurt.t -= dt;
      if (state.hurt.t <= 0) state.hurt = null;
    }
  }

  function activeOrder() {
    const order = findMatchingOrder();
    if (order) return order;
    return state.orders.length ? state.orders[0] : null;
  }

  return {
    state,
    interact,
    grab,
    chop,
    cook,
    plate,
    serve,
    matchesRecipe,
    activeOrder,
    ready() {
      return state.plate.length > 0 && findMatchingOrder() !== null;
    },
    panRects,
    pantryIndexAt,
    stationAt,
    step: update,
    reset() {
      random = createRandom(seed);
      Object.assign(state, initState());
    },
  };
}
