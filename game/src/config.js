// Sizzle & Serve — every tuning number, colour and layout coordinate in one place.
// The kitchen is a fixed 1280x720 logical playfield; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step in seconds. */
export const STEP = 1 / 60;

// --- Layout: the station rectangles the player clicks and the renderer draws. ---
export const LAYOUT = {
  hud: { x: 16, y: 6, w: 1248, h: 28 },           // title, clock and score strip
  tickets: { x: 16, y: 40, w: 1248, h: 88 },       // the order board rail
  pantry: { x: 20, y: 156, w: 196, h: 404 },        // ingredient bins
  cutting: { x: 250, y: 380, w: 200, h: 220 },      // chopping block
  stove: { x: 490, y: 240, w: 180, h: 300 },        // two burners
  plate: { x: 710, y: 360, w: 240, h: 250 },        // plating counter
  pass: { x: 990, y: 156, w: 264, h: 300 },         // serving window
  hint: { x: 250, y: 630, w: 700, h: 66 },          // guidance strip
};

/** Order-board card geometry. */
export const TICKET = { w: 224, h: 80, gap: 14, max: 5 };

/** The day clock, seconds of service before the shift ends. */
export const SHIFT_SECONDS = 90;

/** How long a customer waits before leaving angry (an order's patience). */
export const PATIENCE_SECONDS = 36;

/** Seconds between new orders, shrinking as the shift goes on. */
export const ORDER_INTERVAL_START = 4.0;
export const ORDER_INTERVAL_END = 2.4;

/** Points and tips. */
export const SCORE = {
  serve: 100,
  perfect: 30,
  tip: 5,          // per second of patience left, a customer tips
  angerPenalty: 40,
};

// --- Palette ---
export const PALETTE = {
  wallTop: '#3a1f38',
  wallBottom: '#4c2b46',
  backsplash: '#6e4a3a',
  tileA: '#ecdcbf',
  tileB: '#e2cfad',
  tileLine: '#cbb68c',
  counterWood: '#a06a42',
  counterWoodDark: '#7c4f2e',
  counterTop: '#c58a53',
  metal: '#9aa4ad',
  metalDark: '#6f7a83',
  steel: '#c9d2d8',
  ticket: '#fdf6e3',
  ticketEdge: '#d9c47e',
  ticketBad: '#e5484d',
  ticketText: '#4a3b2a',
  ticketMuted: '#8a7556',
  text: '#2e2220',
  hint: '#3a2b26',
  panel: 'rgba(30,22,32,0.85)',
  title: '#ffe9b0',
  food: {
    tomato: '#e5484d',
    tomatoDark: '#b92f35',
    lettuce: '#67c34f',
    lettuceDark: '#3f8c2c',
    onion: '#c9a1d8',
    onionDark: '#8e6aa6',
    cheese: '#f6bf3c',
    cheeseDark: '#d79a1e',
    pattyRaw: '#c1687a',
    patty: '#8a4b2d',
    pattyDark: '#5f3018',
    bun: '#e8b46a',
    bunDark: '#c78c45',
    egg: '#f7f1dc',
    yolk: '#f6a623',
    grilled: '#6b2f1c',
  },
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
