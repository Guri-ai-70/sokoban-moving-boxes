(function (global, factory) {
  const api = factory(global.SokobanStorage, global.SokobanLevels);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanKeypad = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanStorage, SokobanLevels) {
  const { getBestResult } = SokobanStorage;
  const { LEVELS } = SokobanLevels;

  const COLS = 5;
  const BTN_W = 90;
  const BTN_H = 60;
  const GRID_LEFT = 40;
  const GRID_TOP = 80;
  const GAP = 12;
  const CLEAR_ACCEPT_TOP = GRID_TOP + 2 * (BTN_H + GAP) + 20;

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

  function clearButtonRect() {
    return { x: GRID_LEFT, y: CLEAR_ACCEPT_TOP, w: BTN_W, h: BTN_H };
  }

  function acceptButtonRect() {
    return { x: GRID_LEFT + BTN_W + GAP, y: CLEAR_ACCEPT_TOP, w: BTN_W * 2 + GAP, h: BTN_H };
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

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#f2e9d8';
    ctx.textAlign = 'center';
    ctx.fillText('Select a floor', width / 2, 44);

    ctx.font = '16px "Courier New", monospace';
    for (const lvl of LEVELS) {
      const r = floorButtonRect(lvl.floor);
      ctx.fillStyle = selectedFloor === lvl.floor ? '#e0a83a' : '#7a2a2a';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#f2e9d8';
      ctx.textAlign = 'center';
      ctx.fillText(String(lvl.floor), r.x + r.w / 2, r.y + 22);

      const best = getBestResult(lvl.floor);
      if (best) {
        ctx.font = '11px "Courier New", monospace';
        ctx.fillText(`best ${best.moves}mv`, r.x + r.w / 2, r.y + 44);
        ctx.font = '16px "Courier New", monospace';
      }
    }

    const clear = clearButtonRect();
    ctx.fillStyle = '#555';
    ctx.fillRect(clear.x, clear.y, clear.w, clear.h);
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('CLEAR', clear.x + clear.w / 2, clear.y + clear.h / 2 + 5);

    const accept = acceptButtonRect();
    ctx.fillStyle = '#2a7a2a';
    ctx.fillRect(accept.x, accept.y, accept.w, accept.h);
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('ACCEPT', accept.x + accept.w / 2, accept.y + accept.h / 2 + 5);
    ctx.textAlign = 'left';
  }

  function hitTestKeypad(x, y) {
    for (const lvl of LEVELS) {
      const r = floorButtonRect(lvl.floor);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { type: 'floor', floor: lvl.floor };
      }
    }
    const clear = clearButtonRect();
    if (x >= clear.x && x <= clear.x + clear.w && y >= clear.y && y <= clear.y + clear.h) {
      return { type: 'clear' };
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
