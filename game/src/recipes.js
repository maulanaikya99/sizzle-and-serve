// The menu: every ingredient the player handles and the recipes customers order.
// An ingredient can be sliced on the board and/or cooked on the stove; a recipe is the
// exact set of prepared pieces a plate must hold to leave the pass.

export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e5484d', chop: true, cook: false, shape: 'round' },
  lettuce: { name: 'Lettuce', color: '#67c34f', chop: true, cook: false, shape: 'leafy' },
  onion: { name: 'Onion', color: '#c9a1d8', chop: true, cook: true, shape: 'bulb' },
  cheese: { name: 'Cheese', color: '#f6bf3c', chop: false, cook: false, shape: 'block' },
  patty: { name: 'Patty', color: '#c1687a', chop: false, cook: true, shape: 'disc' },
  bun: { name: 'Bun', color: '#e8b46a', chop: false, cook: false, shape: 'bun' },
  egg: { name: 'Egg', color: '#f7f1dc', chop: false, cook: true, shape: 'egg' },
};

/** The IDs in pantry order, top to bottom. */
export const PANTRY_ORDER = ['tomato', 'lettuce', 'onion', 'cheese', 'patty', 'bun', 'egg'];

// A recipe step asks for an ingredient after a process: 'whole' | 'chopped' | 'cooked'.
// The final field is baked into the frying animation (a patty is flipped over, an egg spreads).
export const RECIPES = [
  {
    id: 'garden-salad',
    name: 'Garden Salad',
    emoji: '🥗',
    steps: [
      { type: 'lettuce', process: 'chopped' },
      { type: 'tomato', process: 'chopped' },
      { type: 'onion', process: 'chopped' },
    ],
  },
  {
    id: 'cheeseburger',
    name: 'Cheeseburger',
    emoji: '🍔',
    steps: [
      { type: 'bun', process: 'whole' },
      { type: 'patty', process: 'cooked' },
      { type: 'cheese', process: 'whole' },
      { type: 'lettuce', process: 'chopped' },
      { type: 'tomato', process: 'chopped' },
    ],
  },
  {
    id: 'cheese-omelet',
    name: 'Cheese Omelet',
    emoji: '🍳',
    steps: [
      { type: 'egg', process: 'cooked' },
      { type: 'cheese', process: 'whole' },
      { type: 'onion', process: 'chopped' },
    ],
  },
  {
    id: 'tomato-soup',
    name: 'Tomato Soup',
    emoji: '🍲',
    steps: [
      { type: 'tomato', process: 'chopped' },
      { type: 'tomato', process: 'chopped' },
      { type: 'onion', process: 'cooked' },
    ],
  },
];

/** Look up a recipe by id. */
export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}

/** A human label for a prepared piece: "Chopped Tomato", "Cooked Patty", "Cheese". */
export function pieceLabel(piece) {
  const ing = INGREDIENTS[piece.type];
  const process = piece.cooked ? 'Cooked' : piece.chopped ? 'Chopped' : '';
  return process ? `${process} ${ing.name}` : ing.name;
}

/** A short chip label for a recipe step, e.g. "🍅x2". */
export function stepChip(step) {
  const glyph = INGREDIENTS[step.type].color;
  return step.process;
}
