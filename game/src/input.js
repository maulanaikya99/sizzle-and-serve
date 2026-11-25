// Mouse and keyboard input. The pointer position and every click are queued and taken once by the
// loop, so a fast double-click is never lost; the digit keys 1..7 grab the matching pantry bin.

const KEY_TO_INDEX = new Map(
  ['1', '2', '3', '4', '5', '6', '7'].map((digit, index) => [`Digit${digit}`, index]),
);

export function createInput(target) {
  let cursor = { clientX: 0, clientY: 0, over: false };
  let clicks = [];
  let keys = [];

  target.addEventListener('pointermove', (event) => {
    cursor.clientX = event.clientX;
    cursor.clientY = event.clientY;
    cursor.over = true;
  });
  target.addEventListener('pointerleave', () => {
    cursor.over = false;
  });
  target.addEventListener('pointerdown', (event) => {
    clicks.push({ clientX: event.clientX, clientY: event.clientY });
  });
  window.addEventListener('keydown', (event) => {
    if (KEY_TO_INDEX.has(event.code)) {
      keys.push(KEY_TO_INDEX.get(event.code));
      event.preventDefault();
    }
  });

  return {
    cursor() {
      return cursor;
    },
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    takeKeys() {
      const taken = keys;
      keys = [];
      return taken;
    },
  };
}
