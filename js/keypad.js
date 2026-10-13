(function (global, factory) {
  const api = factory(global.SokobanStorage, global.SokobanLevels, global.SokobanRender);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanKeypad = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanStorage, SokobanLevels, SokobanRender) {
  const { getBestResult } = SokobanStorage;
  const { LEVELS } = SokobanLevels;
  const { theme, drawIndicator } = SokobanRender;

  function clamp(min, v, max) {
    return Math.max(min, Math.min(max, v));
  }

  const COLS = 5;
  const BTN_W = 130;
  const BTN_H = 130;
  const GRID_LEFT = 40;
  const GRID_TOP = 150;
  const GAP = 16;
  // RESET/ACCEPT sit below however many rows the floor circles actually
  // need (not a hardcoded row count -- that was stale as soon as the
  // level count stopped being a clean multiple of COLS, which silently
  // shifted these buttons under the wrong spot).
  const FLOOR_ROWS = Math.ceil(LEVELS.length / COLS);
  const RESET_ACCEPT_TOP = GRID_TOP + FLOOR_ROWS * (BTN_H + GAP) + 20;
  const ACTION_BTN_H = 60;

  function floorButtonRect(floor) {
    const i = floor - 1;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      x: GRID_LEFT + col * (BTN_W + GAP),
      y: GRID_TOP + row * (BTN_H + GAP),
      w: BTN_W,
      h: BTN_H,
    };
  }

  // Floor buttons render as circles (elevator call-button style) instead
  // of squares; the circle is inscribed in the same grid cell used for
  // layout and hit-testing math above.
  function floorButtonCircle(floor) {
    const r = floorButtonRect(floor);
    return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, radius: Math.min(r.w, r.h) / 2 };
  }

  function resetButtonRect() {
    return { x: GRID_LEFT, y: RESET_ACCEPT_TOP, w: BTN_W, h: ACTION_BTN_H };
  }

  function acceptButtonRect() {
    return { x: GRID_LEFT + BTN_W + GAP, y: RESET_ACCEPT_TOP, w: BTN_W * 2 + GAP, h: ACTION_BTN_H };
  }

  // Lobby layout, derived from the canvas size (not fixed pixels) so the
  // same drawing works on a wide desktop canvas and a tall phone one.
  function lobbyLayout(width, height) {
    const doorTop = height * 0.36;
    const doorH = height * 0.44;
    const doorW = Math.min(doorH * 0.75, width * 0.55);
    const doorX = (width - doorW) / 2;
    const plateW = clamp(36, doorW * 0.18, 60);
    const plateH = plateW * 1.6;
    return {
      door: { x: doorX, y: doorTop, w: doorW, h: doorH },
      plate: {
        x: doorX + doorW + clamp(12, width * 0.04, 40),
        y: doorTop + doorH * 0.45 - plateH / 2,
        w: plateW,
        h: plateH,
      },
      floorY: doorTop + doorH,
    };
  }

  function callButtonRect(width, height) {
    return lobbyLayout(width, height).plate;
  }

  // Splits text into at most two centred lines when it is wider than
  // maxW (a phone-width canvas can't fit the full prompt on one line).
  function fillTextFit(ctx, text, cx, y, maxW, lineH) {
    if (ctx.measureText(text).width <= maxW) {
      ctx.fillText(text, cx, y);
      return;
    }
    const words = text.split(' ');
    const half = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, half).join(' '), cx, y - lineH / 2);
    ctx.fillText(words.slice(half).join(' '), cx, y + lineH / 2);
  }

  // Start screen: a walnut-panelled lobby wall, closed brass elevator
  // doors under an amber "L" indicator, and a brass call plate. Static --
  // any key or tap goes straight to the floor panel.
  function renderLobby(ctx) {
    const c = theme();
    const { width, height } = ctx.canvas;
    const { door, plate, floorY } = lobbyLayout(width, height);

    // wall: alternating walnut panels
    ctx.fillStyle = c['walnut-900'];
    ctx.fillRect(0, 0, width, height);
    const panelW = clamp(60, width / 8, 120);
    for (let x = 0; x < width; x += panelW) {
      ctx.fillStyle = c['walnut-700'];
      ctx.fillRect(x + 4, 0, panelW - 8, floorY);
    }

    // floor: dark terrazzo band with a brass edge strip
    ctx.fillStyle = c.charcoal;
    ctx.fillRect(0, floorY, width, height - floorY);
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(0, floorY, width, 3);

    // title
    const cx = width / 2;
    const titlePx = clamp(30, width * 0.07, 56);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = c['brass-300'];
    ctx.font = `bold ${titlePx}px ${c['font-ui']}`;
    ctx.fillText('SOKOBAN', cx, height * 0.13);
    ctx.fillStyle = c.cream;
    ctx.font = `${Math.round(titlePx * 0.42)}px ${c['font-ui']}`;
    ctx.fillText('Moving Boxes', cx, height * 0.13 + titlePx * 0.75);

    // door frame + two closed brushed-brass leaves
    const frame = clamp(6, door.w * 0.06, 16);
    ctx.fillStyle = c['brass-700'];
    ctx.fillRect(door.x - frame, door.y - frame, door.w + frame * 2, door.h + frame);
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.fillStyle = c['brass-300'];
    for (const f of [0.12, 0.3, 0.62, 0.8]) {
      ctx.fillRect(door.x + door.w * f, door.y + 6, 1, door.h - 12);
    }
    ctx.fillStyle = c['walnut-900'];
    ctx.fillRect(cx - 1.5, door.y, 3, door.h);

    // floor indicator above the doors
    const indH = clamp(28, height * 0.06, 40);
    drawIndicator(ctx, cx, door.y - frame - indH * 0.5 - 10, indH * 1.5, indH, 'L', Math.round(indH * 0.6));

    // call plate with an up-arrow button
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
    ctx.strokeStyle = c['brass-700'];
    ctx.lineWidth = 2;
    ctx.strokeRect(plate.x + 1, plate.y + 1, plate.w - 2, plate.h - 2);
    const bx = plate.x + plate.w / 2, by = plate.y + plate.h / 2, br = plate.w * 0.32;
    ctx.beginPath();
    ctx.arc(bx, by, br + 3, 0, Math.PI * 2);
    ctx.fillStyle = c['walnut-900'];
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = c.amber;
    ctx.fill();
    ctx.fillStyle = c['walnut-900'];
    ctx.beginPath();
    ctx.moveTo(bx, by - br * 0.5);
    ctx.lineTo(bx + br * 0.5, by + br * 0.35);
    ctx.lineTo(bx - br * 0.5, by + br * 0.35);
    ctx.closePath();
    ctx.fill();

    // prompt on the floor band
    const promptPx = clamp(14, width * 0.025, 20);
    ctx.fillStyle = c.cream;
    ctx.font = `${promptPx}px ${c['font-ui']}`;
    ctx.textBaseline = 'middle';
    fillTextFit(ctx, 'Press any key or tap to call the elevator', cx, (floorY + height) / 2, width - 32, promptPx * 1.4);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  function renderKeypad(ctx, selectedFloor) {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = '#3a1414';
    ctx.fillRect(0, 0, width, height);

    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.fillStyle = '#f6cf1e';
    ctx.textAlign = 'center';
    ctx.fillText('Sokoban Moving Boxes', width / 2, 70);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('Select a floor', width / 2, 110);

    for (const lvl of LEVELS) {
      const c = floorButtonCircle(lvl.floor);
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = selectedFloor === lvl.floor ? '#e0a83a' : '#7a2a2a';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#f2e9d8';
      ctx.textAlign = 'center';
      ctx.font = 'bold 56px "Courier New", monospace';
      ctx.fillText(String(lvl.floor), c.cx, c.cy + 18);

      const best = getBestResult(lvl.floor);
      if (best) {
        ctx.font = '13px "Courier New", monospace';
        ctx.fillText(`best ${best.moves}mv`, c.cx, c.cy + c.radius + 16);
      }
    }
    ctx.font = '18px "Courier New", monospace';

    const reset = resetButtonRect();
    ctx.fillStyle = '#555';
    ctx.fillRect(reset.x, reset.y, reset.w, reset.h);
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('RESET', reset.x + reset.w / 2, reset.y + reset.h / 2 + 6);

    const accept = acceptButtonRect();
    ctx.fillStyle = '#2a7a2a';
    ctx.fillRect(accept.x, accept.y, accept.w, accept.h);
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('ACCEPT', accept.x + accept.w / 2, accept.y + accept.h / 2 + 5);
    ctx.textAlign = 'left';
  }

  function hitTestKeypad(x, y) {
    for (const lvl of LEVELS) {
      const c = floorButtonCircle(lvl.floor);
      const dx = x - c.cx, dy = y - c.cy;
      if (dx * dx + dy * dy <= c.radius * c.radius) {
        return { type: 'floor', floor: lvl.floor };
      }
    }
    const reset = resetButtonRect();
    if (x >= reset.x && x <= reset.x + reset.w && y >= reset.y && y <= reset.y + reset.h) {
      return { type: 'reset' };
    }
    const accept = acceptButtonRect();
    if (x >= accept.x && x <= accept.x + accept.w && y >= accept.y && y <= accept.y + accept.h) {
      return { type: 'accept' };
    }
    return null;
  }

  function hitTestCallButton(x, y, canvasWidth, canvasHeight) {
    const btn = callButtonRect(canvasWidth, canvasHeight);
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  return { renderLobby, renderKeypad, hitTestKeypad, hitTestCallButton };
});
