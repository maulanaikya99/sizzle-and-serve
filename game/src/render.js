// Drawing only: the world's state in, pixels out. The kitchen is painted from a fixed 1280x720
// field that is scaled to fit the window, so every station keeps its place whatever the screen.
// Food is drawn with plain canvas primitives — no images, so the game stays a handful of files.

import { FIELD, LAYOUT, PALETTE, TICKET, FONT, SHIFT_SECONDS, SCORE } from './config.js';
import { INGREDIENTS, PANTRY_ORDER, pieceLabel } from './recipes.js';

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    view.scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
    view.x = (cssW - FIELD.width * view.scale) / 2;
    view.y = (cssH - FIELD.height * view.scale) / 2;
  }

  // Size the canvas to the window now and whenever the window changes, so the whole kitchen
  // stays visible and crisp (the backing store is the window in device pixels).
  window.addEventListener('resize', resize);
  resize();

  function begin() {
    context.setTransform(
      window.devicePixelRatio * view.scale,
      0,
      0,
      window.devicePixelRatio * view.scale,
      window.devicePixelRatio * view.x,
      window.devicePixelRatio * view.y,
    );
  }

  function toField(clientX, clientY) {
    return {
      x: (clientX - view.x) / view.scale,
      y: (clientY - view.y) / view.scale,
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${size}|${weight}`;
    if (!fonts.has(key)) fonts.set(key, `${weight}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'middle';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function circle(cx, cy, r) {
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
  }

  function shadowed(cx, cy, r) {
    context.beginPath();
    ellipsePath(context, cx, cy + 3, r * 0.9, r * 0.4);
    context.fillStyle = 'rgba(0,0,0,0.18)';
    context.fill();
  }

  // A soft shadow cast on the floor under a station (drawn before the station itself).
  function floorShadow(x, y, w, h) {
    context.beginPath();
    ellipsePath(context, x + w / 2, y + h + 8, w * 0.54, 22);
    const g = context.createRadialGradient(x + w / 2, y + h + 8, 4, x + w / 2, y + h + 8, w * 0.54);
    g.addColorStop(0, 'rgba(30,16,8,0.32)');
    g.addColorStop(1, 'rgba(30,16,8,0)');
    context.fillStyle = g;
    context.fill();
  }

  // A glossy highlight on top of a round or rounded piece, so it reads as juicy and lit.
  function gloss(cx, cy, rx, ry) {
    context.fillStyle = 'rgba(255,255,255,0.5)';
    ellipsePath(context, cx, cy, rx, ry);
    context.fill();
  }

  // --------------------------------------------------------------------- food

  function seed(x, y, a) {
    context.save();
    context.translate(x, y);
    context.rotate(a);
    context.fillStyle = '#fdf4d8';
    ellipsePath(context, 0, 0, 3.4, 2);
    context.fill();
    context.restore();
  }

  function drawTomato(cx, cy, r, chopped) {
    if (chopped) {
      pile(cx, cy, r, PALETTE.food.tomato, PALETTE.food.tomatoDark, 6, 'wedge');
      return;
    }
    shadowed(cx, cy, r);
    const g = context.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ff7a70');
    g.addColorStop(1, PALETTE.food.tomato);
    context.fillStyle = g;
    circle(cx, cy, r);
    context.fill();
    context.fillStyle = PALETTE.food.tomatoDark;
    ellipsePath(context, cx, cy + r * 0.55, r * 0.5, r * 0.35);
    context.fill();
    // star leaf
    context.fillStyle = PALETTE.food.lettuce;
    starPath(cx, cy - r - 1, r * 0.5, 5);
    context.fill();
    context.fillStyle = '#f7f1dc';
    ellipsePath(context, cx - r * 0.4, cy - r * 0.35, r * 0.22, r * 0.12);
    context.fill();
    gloss(cx - r * 0.32, cy - r * 0.42, r * 0.16, r * 0.1);
  }

  function drawLettuce(cx, cy, r, chopped) {
    if (chopped) {
      pile(cx, cy, r, PALETTE.food.lettuce, PALETTE.food.lettuceDark, 7, 'shred');
      return;
    }
    shadowed(cx, cy, r);
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const lx = cx + Math.cos(a) * r * 0.55;
      const ly = cy + Math.sin(a) * r * 0.55;
      context.save();
      context.translate(lx, ly);
      context.rotate(a);
      const g = context.createLinearGradient(-r * 0.7, 0, r * 0.7, 0);
      g.addColorStop(0, PALETTE.food.lettuce);
      g.addColorStop(1, PALETTE.food.lettuceDark);
      context.fillStyle = g;
      ellipsePath(context, 0, 0, r * 0.7, r * 0.34);
      context.fill();
      context.restore();
    }
  }

  function drawOnion(cx, cy, r, state) {
    if (state === 'chopped') {
      pile(cx, cy, r, '#efe2f4', PALETTE.food.onion, 6, 'curl');
      return;
    }
    if (state === 'cooked') {
      pile(cx, cy, r, '#d9a441', '#a56a1e', 6, 'curl');
      return;
    }
    shadowed(cx, cy, r);
    const g = context.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#e6c9f0');
    g.addColorStop(1, PALETTE.food.onion);
    context.fillStyle = g;
    circle(cx, cy, r);
    context.fill();
    context.strokeStyle = PALETTE.food.onionDark;
    context.lineWidth = r * 0.14;
    circle(cx, cy, r * 0.55);
    context.stroke();
    circle(cx, cy, r * 0.2);
    context.stroke();
    gloss(cx - r * 0.35, cy - r * 0.4, r * 0.2, r * 0.12);
  }

  function drawCheese(cx, cy, r) {
    shadowed(cx, cy, r);
    const x = cx - r, y = cy - r * 0.7, w = r * 2, h = r * 1.5;
    roundRect(x, y, w, h, r * 0.24);
    const g = context.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#ffd86b');
    g.addColorStop(1, PALETTE.food.cheeseDark);
    context.fillStyle = g;
    context.fill();
    context.strokeStyle = PALETTE.food.cheeseDark;
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = '#c98a1e';
    circle(cx - r * 0.45, cy - r * 0.15, r * 0.18);
    context.fill();
    circle(cx + r * 0.5, cy + r * 0.1, r * 0.13);
    context.fill();
  }

  function drawPatty(cx, cy, r, cooked) {
    shadowed(cx, cy, r);
    const body = cooked ? PALETTE.food.patty : PALETTE.food.pattyRaw;
    const dark = cooked ? PALETTE.food.pattyDark : '#8f4a5c';
    const g = context.createRadialGradient(cx, cy - r * 0.3, r * 0.2, cx, cy, r);
    g.addColorStop(0, cooked ? '#a65f3c' : '#d98a9a');
    g.addColorStop(1, body);
    context.fillStyle = g;
    ellipsePath(context, cx, cy, r, r * 0.82);
    context.fill();
    context.strokeStyle = dark;
    context.lineWidth = 1.5;
    context.stroke();
    if (cooked) {
      context.strokeStyle = PALETTE.food.grilled;
      context.lineWidth = r * 0.16;
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(cx - r * 0.62, cy + i * r * 0.42);
        context.lineTo(cx + r * 0.62, cy - i * r * 0.42);
        context.stroke();
      }
      gloss(cx - r * 0.3, cy - r * 0.3, r * 0.22, r * 0.1);
    } else {
      context.fillStyle = '#e7b7c2';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ellipsePath(context, cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.4, r * 0.12, r * 0.07);
        context.fill();
      }
    }
  }

  function drawBun(cx, cy, r) {
    shadowed(cx, cy, r);
    const g = context.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#f6d29a');
    g.addColorStop(1, PALETTE.food.bunDark);
    context.fillStyle = g;
    context.beginPath();
    context.arc(cx, cy, r, Math.PI, 0);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.food.bunDark;
    context.lineWidth = 1.5;
    context.stroke();
    gloss(cx - r * 0.35, cy - r * 0.1, r * 0.3, r * 0.14);
    context.fillStyle = '#fdf4d8';
    seed(cx - r * 0.5, cy + r * 0.25, -0.4);
    seed(cx + r * 0.05, cy - r * 0.15, 0.6);
    seed(cx + r * 0.5, cy + r * 0.3, 0.2);
    seed(cx - r * 0.1, cy + r * 0.5, -0.2);
  }

  function drawEgg(cx, cy, r, cooked) {
    shadowed(cx, cy, r);
    if (cooked) {
      // Fried egg: white ragged lobes, golden yolk.
      context.fillStyle = '#fff3cf';
      raggedEgg(cx, cy, r);
      context.fill();
      context.strokeStyle = '#e5c37a';
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = PALETTE.food.yolk;
      circle(cx, cy, r * 0.42);
      context.fill();
      context.fillStyle = '#ffc55e';
      circle(cx, cy, r * 0.24);
      context.fill();
      gloss(cx - r * 0.12, cy - r * 0.12, r * 0.1, r * 0.06);
      return;
    }
    // Raw: an oval shell split the egg is not cracked yet — draw a white oval with yolk.
    context.fillStyle = PALETTE.food.egg;
    ellipsePath(context, cx, cy, r * 0.86, r * 1.02);
    context.fill();
    context.strokeStyle = '#d8d0b0';
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = PALETTE.food.yolk;
    circle(cx, cy, r * 0.4);
    context.fill();
  }

  function raggedEgg(cx, cy, r) {
    const lobes = 7;
    context.beginPath();
    for (let i = 0; i < lobes; i += 1) {
      const a0 = (i / lobes) * Math.PI * 2;
      const a1 = ((i + 0.5) / lobes) * Math.PI * 2;
      const p0 = { x: cx + Math.cos(a0) * r * 0.92, y: cy + Math.sin(a0) * r * 0.82 };
      const p1 = { x: cx + Math.cos(a1) * r * 1.06, y: cy + Math.sin(a1) * r * 0.96 };
      if (i === 0) context.moveTo(p0.x, p0.y);
      else context.lineTo(p0.x, p0.y);
      context.quadraticCurveTo(cx + Math.cos((a0 + a1) / 2) * r * 1.12, cy + Math.sin((a0 + a1) / 2) * r * 1.02, p1.x, p1.y);
    }
    context.closePath();
  }

  function starPath(cx, cy, r, points) {
    context.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  }

  function ellipsePath(c, x, y, rx, ry) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }

  // A cooked/chopped mound of pieces.
  function pile(cx, cy, r, light, dark, count, kind) {
    const base = cy + r * 0.4;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      const px = cx + Math.cos(a) * r * 0.5;
      const py = base + Math.sin(a) * r * 0.35 * (i % 3 === 0 ? 1 : 0.5) * -1 - (i % 3) * r * 0.18;
      context.save();
      context.translate(px, py);
      context.rotate(a);
      if (kind === 'shred') {
        context.fillStyle = light;
        roundRect(-r * 0.55, -r * 0.12, r * 1.1, r * 0.24, r * 0.12);
        context.fill();
      } else if (kind === 'wedge') {
        context.fillStyle = i % 2 ? light : dark;
        context.beginPath();
        context.moveTo(0, -r * 0.4);
        context.arcTo(r * 0.5, 0, 0, r * 0.4, r * 0.2);
        context.closePath();
        context.fill();
      } else {
        context.fillStyle = i % 2 ? light : dark;
        ellipsePath(context, 0, 0, r * 0.5, r * 0.26);
        context.fill();
      }
      context.restore();
    }
  }

  function drawPiece(piece, cx, cy, r) {
    const ing = INGREDIENTS[piece.type];
    if (piece.type === 'tomato') drawTomato(cx, cy, r, piece.chopped);
    else if (piece.type === 'lettuce') drawLettuce(cx, cy, r, piece.chopped);
    else if (piece.type === 'onion') drawOnion(cx, cy, r, piece.cooked ? 'cooked' : piece.chopped ? 'chopped' : 'whole');
    else if (piece.type === 'cheese') drawCheese(cx, cy, r);
    else if (piece.type === 'patty') drawPatty(cx, cy, r, piece.cooked);
    else if (piece.type === 'bun') drawBun(cx, cy, r);
    else if (piece.type === 'egg') drawEgg(cx, cy, r, piece.cooked);
    else circlePiece(piece, cx, cy, r, ing.color);
  }

  function circlePiece(piece, cx, cy, r, color) {
    shadowed(cx, cy, r);
    context.fillStyle = color;
    circle(cx, cy, r);
    context.fill();
  }

  // --------------------------------------------------------------------- scene

  function drawBackground() {
    // wall behind the board and hud
    const wall = context.createLinearGradient(0, 0, 0, LAYOUT.tickets.y + LAYOUT.tickets.h + 10);
    wall.addColorStop(0, PALETTE.wallTop);
    wall.addColorStop(1, PALETTE.wallBottom);
    context.fillStyle = wall;
    context.fillRect(0, 0, FIELD.width, LAYOUT.tickets.y + LAYOUT.tickets.h + 10);
    // warm backsplash strip where the wall meets the floor
    const floorTop = LAYOUT.tickets.y + LAYOUT.tickets.h + 8;
    context.fillStyle = PALETTE.backsplash;
    context.fillRect(0, floorTop - 10, FIELD.width, 14);
    context.fillStyle = 'rgba(0,0,0,0.18)';
    context.fillRect(0, floorTop + 2, FIELD.width, 2);
    // floor tiles
    const size = 64;
    for (let y = floorTop + 4, row = 0; y < FIELD.height; y += size, row += 1) {
      for (let x = 0; x < FIELD.width; x += size) {
        const col = (x / size) | 0;
        context.fillStyle = (row + col) % 2 === 0 ? PALETTE.tileA : PALETTE.tileB;
        context.fillRect(x, y, size, size);
      }
    }
    // grout lines
    context.strokeStyle = PALETTE.tileLine;
    context.lineWidth = 1;
    context.globalAlpha = 0.4;
    for (let x = 0; x <= FIELD.width; x += size) {
      context.beginPath();
      context.moveTo(x, floorTop);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  // Soft shadows under each station, drawn on the floor before the furniture.
  function drawFloorShadows() {
    for (const key of ['pantry', 'cutting', 'stove', 'plate', 'pass']) {
      const r = LAYOUT[key];
      floorShadow(r.x, r.y, r.w, r.h);
    }
  }

  function drawHud(state) {
    const h = LAYOUT.hud;
    drawChefHat(h.x + 20, h.y + h.h / 2, 15);
    text('SIZZLE & SERVE', h.x + 44, h.y + h.h / 2, 21, PALETTE.title, 'left', 'bold ');
    // Day clock: a circular countdown ring with mm:ss inside.
    const cx = FIELD.width - 40;
    const cy = h.y + h.h / 2;
    const secs = Math.ceil(state.shiftTime);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    const frac = state.shiftTime / SHIFT_SECONDS;
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(255,255,255,0.18)';
    circle(cx, cy, 15);
    context.stroke();
    context.strokeStyle = state.shiftTime < 15 ? PALETTE.ticketBad : '#7fd6a0';
    context.beginPath();
    context.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    context.stroke();
    text(state.shiftTime < 15 ? `${ss}` : `${mm}:${ss}`, cx, cy, 12, PALETTE.title, 'center', 'bold ');
    // Score with a small coin.
    text(`$${state.score}`, cx - 120, cy, 16, PALETTE.ticket, 'right', 'bold ');
    context.fillStyle = '#f6bf3c';
    circle(cx - 128, cy, 6);
    context.fill();
    context.strokeStyle = '#b9892e';
    context.lineWidth = 1;
    context.stroke();
  }

  // A small chef's toque: a band with three puffy puffs on top.
  function drawChefHat(cx, cy, r) {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(cx - r * 0.7, cy - r * 0.1, r * 0.55, Math.PI, 0);
    context.arc(cx, cy - r * 0.35, r * 0.55, Math.PI, 0);
    context.arc(cx + r * 0.7, cy - r * 0.1, r * 0.55, Math.PI, 0);
    context.closePath();
    context.fill();
    roundRect(cx - r, cy + r * 0.15, r * 2, r * 0.5, r * 0.2);
    context.fill();
    context.strokeStyle = '#c9c2d0';
    context.lineWidth = 1;
    context.stroke();
  }

  function drawTickets(state) {
    let tx = LAYOUT.tickets.x;
    const ty = LAYOUT.tickets.y + 4;
    for (const order of state.orders) {
      drawTicket(order, tx, ty);
      tx += TICKET.w + TICKET.gap;
      if (tx + TICKET.w > FIELD.width - LAYOUT.tickets.x) break;
    }
  }

  function drawTicket(order, x, y) {
    const w = TICKET.w;
    const h = TICKET.h;
    const urgent = order.patience < 9;
    context.fillStyle = '#6e5c88';
    context.beginPath();
    context.arc(x + 6, y + 6, 3, 0, Math.PI * 2);
    context.arc(x + w - 6, y + 6, 3, 0, Math.PI * 2);
    context.fill();
    roundRect(x, y, w, h, 8);
    context.fillStyle = PALETTE.ticket;
    context.fill();
    context.strokeStyle = urgent ? PALETTE.ticketBad : PALETTE.ticketEdge;
    context.lineWidth = 2;
    context.stroke();
    text(order.recipe.emoji, x + 16, y + 22, 18, PALETTE.ticketText, 'left');
    text(order.recipe.name, x + 38, y + 22, 13, PALETTE.ticketText, 'left', 'bold ');
    // ingredient chips, wrapping onto a second row when a recipe has many steps
    let cx = x + 12;
    let cy = y + 44;
    const chipW = 47;
    const chipGap = 5;
    for (const step of order.recipe.steps) {
      if (cx + chipW > x + w - 8) {
        cx = x + 12;
        cy = y + 62;
      }
      const ing = INGREDIENTS[step.type];
      roundRect(cx, cy - 8, chipW, 16, 6);
      context.fillStyle = ing.color;
      context.fill();
      context.strokeStyle = 'rgba(0,0,0,0.18)';
      context.lineWidth = 1;
      context.stroke();
      const glyph = step.process === 'chopped' ? '✂' : step.process === 'cooked' ? '♨' : '';
      text(glyph + (glyph ? ing.name : ing.name), cx + chipW / 2, cy, 9, '#fff', 'center', 'bold ');
      cx += chipW + chipGap;
    }
    // patience bar
    const pby = y + h - 9;
    roundRect(x + 8, pby - 5, w - 16, 9, 4.5);
    context.fillStyle = 'rgba(0,0,0,0.14)';
    context.fill();
    const frac = Math.max(0, order.patience / 36);
    roundRect(x + 8, pby - 5, (w - 16) * frac, 9, 4.5);
    context.fillStyle = urgent ? PALETTE.ticketBad : frac > 0.5 ? '#7fb34e' : '#e4a53a';
    context.fill();
    text(`${Math.ceil(order.patience)}s`, x + w - 8, pby, 10, PALETTE.ticketText, 'right', 'bold ');
  }

  function drawPantry(state) {
    const p = LAYOUT.pantry;
    // wooden frame
    roundRect(p.x - 8, p.y - 8, p.w + 16, p.h + 16, 14);
    context.fillStyle = PALETTE.counterWoodDark;
    context.fill();
    roundRect(p.x, p.y, p.w, p.h, 10);
    context.fillStyle = '#4a3b2a';
    context.fill();
    text('PANTRY', p.x + p.w / 2, p.y - 22, 14, PALETTE.title, 'center', 'bold ');
    const bin = (p.h - 20) / PANTRY_ORDER.length;
    PANTRY_ORDER.forEach((type, index) => {
      const bx = p.x + 10;
      const by = p.y + 10 + index * bin;
      const bw = p.w - 20;
      const bh = bin - 4;
      roundRect(bx, by, bw, bh, 8);
      context.fillStyle = index % 2 === 0 ? '#574633' : '#4c3d2c';
      context.fill();
      const ing = INGREDIENTS[type];
      const cy = by + bh / 2;
      drawPieceForBin(type, bx + 30, cy, 20);
      text(ing.name, bx + 56, cy, 14, '#f3e7d3', 'left', 'bold ');
      text(`${index + 1}`, bx + bw - 14, cy, 12, '#cab79a', 'center', 'bold ');
    });
  }

  function drawPieceForBin(type, cx, cy, r) {
    const piece = { type, chopped: false, cooked: false };
    drawPiece(piece, cx, cy, r);
  }

  function drawCuttingBoard(state) {
    const c = LAYOUT.cutting;
    text('CUTTING BOARD', c.x + c.w / 2, c.y - 20, 14, PALETTE.hint, 'center', 'bold ');
    // board
    roundRect(c.x - 6, c.y - 6, c.w + 12, c.h + 12, 22);
    context.fillStyle = PALETTE.counterWoodDark;
    context.fill();
    roundRect(c.x, c.y, c.w, c.h, 18);
    const wood = context.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
    wood.addColorStop(0, '#d29a62');
    wood.addColorStop(1, PALETTE.counterWood);
    context.fillStyle = wood;
    context.fill();
    // grain
    context.strokeStyle = 'rgba(124,79,46,0.35)';
    context.lineWidth = 1.5;
    for (let lx = c.x + 20; lx < c.x + c.w; lx += 22) {
      context.beginPath();
      context.moveTo(lx, c.y + 14);
      context.lineTo(lx, c.y + c.h - 14);
      context.stroke();
    }
    // knife
    drawKnife(context, c.x + c.w - 44, c.y + 74, 0.6);

    if (state.board) {
      const probe = state.board.progress >= 1 ? 1 : state.board.progress;
      const bx = c.x + c.w / 2;
      const by = c.y + c.h / 2 + 8;
      drawPiece(state.board.piece, bx, by, 34);
      if (state.board.progress < 1) {
        // knife chops: animate slightly
        const bob = Math.sin(probe * Math.PI * 3) * 8;
        drawKnife(context, bx + 36 + bob, by - 30 - probe * 30, 0.9);
      } else {
        text('Done!', bx, c.y + 26, 14, '#2f6b26', 'center', 'bold ');
      }
    } else {
      text('Drop a vegetable here to chop', c.x + c.w / 2, c.y + c.h / 2, 14, 'rgba(46,34,32,0.6)', 'center');
    }
  }

  function drawStove(state) {
    const s = LAYOUT.stove;
    text('STOVE', s.x + s.w / 2, s.y - 14, 14, PALETTE.hint, 'center', 'bold ');
    roundRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12, 16);
    context.fillStyle = '#33383d';
    context.fill();
    const rects = [
      { x: s.x + 14, y: s.y + 16, w: s.w - 28, h: 120 },
      { x: s.x + 14, y: s.y + 160, w: s.w - 28, h: 120 },
    ];
    rects.forEach((r, i) => {
      const pan = state.pans[i];
      // burner
      context.fillStyle = pan.lit ? '#ff9b42' : '#1c1f22';
      ellipsePath(context, r.x + r.w / 2, r.y + r.h - 8, r.w * 0.42, 18);
      context.fill();
      if (pan.lit) {
        context.fillStyle = '#ffd23e';
        ellipsePath(context, r.x + r.w / 2, r.y + r.h - 10, r.w * 0.5, 14);
        context.fill();
      }
      // pan body
      context.fillStyle = PALETTE.steel;
      roundRect(r.x - 6, r.y, r.w + 12, r.h * 0.5, 10);
      context.fill();
      context.strokeStyle = PALETTE.metalDark;
      context.lineWidth = 2;
      context.stroke();
      // handle
      context.fillStyle = PALETTE.metalDark;
      roundRect(r.x + r.w - 6, r.y + r.h * 0.3, 30, 12, 5);
      context.fill();
      // piece inside
      if (pan.piece) {
        const probe = Math.min(1, pan.progress);
        const py = r.y + Math.max(4, (1 - probe) * 20);
        drawPiece(pan.piece, r.x + r.w / 2, py, 30);
        if (pan.progress >= 1) text('Done!', r.x + r.w / 2, r.y + 14, 13, '#2f6b26', 'center', 'bold ');
        else if (pan.lit) {
          // sizzle lines
          context.strokeStyle = 'rgba(255,255,255,0.6)';
          context.lineWidth = 1.5;
          for (let k = 0; k < 3; k += 1) {
            const sx = r.x + r.w / 2 + Math.sin(probe * 20 + k * 2) * 14;
            context.beginPath();
            context.moveTo(sx, r.y - 10);
            context.lineTo(sx, r.y - 26);
            context.stroke();
          }
        }
      }
    });
  }

  function drawPlate(state, ready) {
    const p = LAYOUT.plate;
    text('PLATE', p.x + p.w / 2, p.y - 20, 14, PALETTE.hint, 'center', 'bold ');
    if (ready) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2 + 6;
      context.save();
      context.lineWidth = 5;
      context.strokeStyle = 'rgba(127,214,160,0.9)';
      context.beginPath();
      context.arc(cx, cy, 104, -Math.PI / 2, Math.PI * 1.5);
      context.stroke();
      context.lineWidth = 12;
      context.strokeStyle = 'rgba(127,214,160,0.28)';
      context.stroke();
      context.restore();
    }
    roundRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12, 16);
    context.fillStyle = PALETTE.counterWoodDark;
    context.fill();
    roundRect(p.x, p.y, p.w, p.h, 12);
    context.fillStyle = PALETTE.counterTop;
    context.fill();
    // the plate
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2 + 6;
    const pl = context.createRadialGradient(cx - 18, cy - 18, 6, cx, cy, 92);
    pl.addColorStop(0, '#ffffff');
    pl.addColorStop(1, '#d8dde2');
    context.fillStyle = pl;
    circle(cx, cy, 92);
    context.fill();
    context.strokeStyle = '#b7c0c9';
    context.lineWidth = 3;
    context.stroke();
    context.strokeStyle = '#cdd6dd';
    context.lineWidth = 1.5;
    circle(cx, cy, 70);
    context.stroke();

    if (state.plate.length === 0) {
      text('Add ingredients here', cx, cy, 14, 'rgba(46,34,32,0.55)', 'center');
    } else {
      const n = state.plate.length;
      state.plate.forEach((piece, i) => {
        const a = (i / Math.max(1, n)) * Math.PI * 1.5 - Math.PI * 0.75;
        const rr = n === 1 ? 0 : 48;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.7;
        drawPiece(piece, px, py, n === 1 ? 46 : 28);
      });
    }
    text(`${state.plate.length}`, p.x + 14, p.y + 20, 12, 'rgba(46,34,32,0.6)', 'left', 'bold ');
  }

  function drawPass(state, hasMatch) {
    const p = LAYOUT.pass;
    text('PASS', p.x + p.w / 2, p.y - 20, 14, PALETTE.hint, 'center', 'bold ');
    // window with a warm shutter
    roundRect(p.x - 8, p.y - 8, p.w + 16, p.h + 16, 16);
    context.fillStyle = '#7c3f2c';
    context.fill();
    roundRect(p.x, p.y, p.w, p.h, 12);
    const warm = context.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    warm.addColorStop(0, '#3a2622');
    warm.addColorStop(1, '#54382f');
    context.fillStyle = warm;
    context.fill();
    // small bell
    context.fillStyle = '#e9c46a';
    context.beginPath();
    context.arc(p.x + p.w / 2, p.y + 44, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#b9892e';
    ellipsePath(context, p.x + p.w / 2, p.y + 60, 22, 6);
    context.fill();
    if (hasMatch) {
      text('ORDER READY —', p.x + p.w / 2, p.y + 96, 15, '#a8e6a1', 'center', 'bold ');
      text('click to serve!', p.x + p.w / 2, p.y + 118, 15, '#a8e6a1', 'center', 'bold ');
    } else {
      text('Serve a finished', p.x + p.w / 2, p.y + 96, 15, '#e6c9a0', 'center', 'bold ');
      text('plate here', p.x + p.w / 2, p.y + 118, 15, '#e6c9a0', 'center', 'bold ');
    }
    // streak / served tallies
    text(`Served ${state.served}`, p.x + p.w / 2, p.y + 160, 14, '#f3e7d3', 'center');
    text(`Left angry ${state.lost}`, p.x + p.w / 2, p.y + 184, 13, '#e6c9a0', 'center');
  }

  function drawHeld(state, cursorInField) {
    if (state.held && cursorInField) {
      const scale = 1;
      drawPiece(state.held, cursorInField.x + 22, cursorInField.y + 22, 30 * scale);
      text(pieceLabel(state.held), cursorInField.x + 10, cursorInField.y - 12, 13, '#2e2220', 'left', 'bold ');
    }
  }

  function drawHint(state) {
    const h = LAYOUT.hint;
    roundRect(h.x, h.y, h.w, h.h, 12);
    context.fillStyle = 'rgba(30,22,32,0.82)';
    context.fill();
    const order = state.plate.length > 0 && state.orders.length > 0 ? state.orders[0] : null;
    const line = order
      ? `${order.recipe.emoji} ${order.recipe.name}: ${order.recipe.steps.map((s) => INGREDIENTS[s.type].name + (s.process === 'whole' ? '' : ' ' + s.process)).join(', ')}`
      : 'Grab from the pantry, chop, cook, plate, then serve at the pass. Keys 1-7 pick an ingredient.';
    text(line, h.x + 14, h.y + h.h / 2, 14, '#efe6d4', 'left');
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      context.globalAlpha = Math.max(0, Math.min(1, p.life / 0.5));
      context.fillStyle = p.color;
      circle(p.x, p.y, p.steam ? p.size * 1.6 : p.size);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawShiftOver(state) {
    if (!state.shiftOver) return;
    context.fillStyle = 'rgba(20,12,18,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRect(FIELD.width / 2 - 300, 200, 600, 300, 22);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.strokeStyle = PALETTE.title;
    context.lineWidth = 3;
    context.stroke();
    text('SHIFT OVER', FIELD.width / 2, 250, 40, PALETTE.title, 'center', 'bold ');
    text(`You served ${state.served} orders and earned $${state.score} ($${state.tips} in tips).`, FIELD.width / 2, 320, 18, '#f3e7d3', 'center');
    text(`${state.lost} customers left angry.`, FIELD.width / 2, 352, 15, '#e6c9a0', 'center');
    text('Click or press Enter to open the kitchen again.', FIELD.width / 2, 420, 16, '#9fb7ce', 'center', 'bold ');
  }

  function drawMessage(state) {
    if (!state.message) return;
    const m = state.message;
    roundRect(FIELD.width / 2 - 260, 128, 520, 34, 12);
    context.fillStyle = 'rgba(20,14,10,0.85)';
    context.fill();
    context.strokeStyle = m.kind === 'good' ? '#7fb34e' : m.kind === 'bad' ? PALETTE.ticketBad : '#e9c46a';
    context.lineWidth = 2;
    context.stroke();
    text(m.text, FIELD.width / 2, 145, 14, '#f3e7d3', 'center', 'bold ');
  }

  function drawHurt(state) {
    if (!state.hurt) return;
    const at = state.hurt.at;
    const r = at === 'cutting' ? LAYOUT.cutting : at === 'stove' ? LAYOUT.stove : LAYOUT.pass;
    context.globalAlpha = state.hurt.t;
    roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 18);
    context.fillStyle = 'rgba(229,72,77,0.45)';
    context.fill();
    context.globalAlpha = 1;
  }

  function draw(state, ready, cursorInField) {
    begin();
    drawBackground();
    drawFloorShadows();
    drawPantry(state);
    drawCuttingBoard(state);
    drawStove(state);
    drawPlate(state, Boolean(ready));
    drawPass(state, Boolean(ready));
    drawHud(state);
    drawTickets(state);
    drawParticles(state);
    drawHeld(state, cursorInField);
    drawHint(state);
    drawMessage(state);
    drawHurt(state);
    drawShiftOver(state);
  }

  return {
    draw,
    resize,
    toField,
  };
}

// A cooking knife with a steel blade and a wooden handle.
function drawKnife(context, x, y, angle) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = '#dfe6eb';
  context.beginPath();
  context.moveTo(-34, 0);
  context.lineTo(14, 0);
  context.lineTo(8, -8);
  context.lineTo(-34, -8);
  context.closePath();
  context.fill();
  context.fillStyle = '#6b4a2c';
  roundRectAt(context, 14, -5, 26, 10, 4);
  context.fill();
  context.restore();
}

function roundRectAt(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}
