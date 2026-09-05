(function (global, factory) {
  const api = factory(global.SokobanStorage, global.SokobanLevels);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanKeypad = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanStorage, SokobanLevels) {
  const { getBestResult } = SokobanStorage;
  const { LEVELS } = SokobanLevels;

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

  function callButtonRect(width, height) {
    return { x: width / 2 + 70, y: height / 2 - 30, w: 26, h: 26 };
  }

  // slide: 0 = doors closed (waiting to be called), 1 = fully open.
  // called: whether the call button has been pressed (lights it up and
  // swaps the prompt text) even before the doors finish opening.
  function renderLobby(ctx, slide, called) {
    slide = slide || 0;
    const { width, height } = ctx.canvas;
    ctx.fillStyle = '#5a1a5a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(width / 2 - 80, height / 2 - 140, 160, 220);

    const doorTravel = 55 * slide;
    ctx.fillStyle = '#7ad0e0';
    ctx.fillRect(width / 2 - 60 - doorTravel, height / 2 - 120, 50, 180);
    ctx.fillRect(width / 2 + 10 + doorTravel, height / 2 - 120, 50, 180);
    if (slide > 0.02) {
      // reveal a dark elevator interior behind the parting doors
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(width / 2 - 60, height / 2 - 120, 120, 180);
      ctx.fillStyle = '#7ad0e0';
      ctx.fillRect(width / 2 - 60 - doorTravel, height / 2 - 120, 50, 180);
      ctx.fillRect(width / 2 + 10 + doorTravel, height / 2 - 120, 50, 180);
    }

    const btn = callButtonRect(width, height);
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(btn.x - 4, btn.y - 4, btn.w + 8, btn.h + 8);
    ctx.beginPath();
    ctx.arc(btn.x + btn.w / 2, btn.y + btn.h / 2, btn.w / 2, 0, Math.PI * 2);
    ctx.fillStyle = called ? '#f6cf72' : '#c0392b';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    ctx.moveTo(btn.x + btn.w / 2, btn.y + 6);
    ctx.lineTo(btn.x + btn.w - 6, btn.y + btn.h - 6);
    ctx.lineTo(btn.x + 6, btn.y + btn.h - 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f2e9d8';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 + 60, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width / 2 - 14, height / 2 + 78, 28, 60);
    ctx.fillStyle = '#35e0e8';
    ctx.font = '20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      called ? 'Calling the elevator...' : 'Press any key or click the button to call the elevator',
      width / 2, height - 60
    );
    ctx.textAlign = 'left';
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
    return x >= btn.x - 4 && x <= btn.x + btn.w + 4 && y >= btn.y - 4 && y <= btn.y + btn.h + 4;
  }

  return { renderLobby, renderKeypad, hitTestKeypad, hitTestCallButton };
});
