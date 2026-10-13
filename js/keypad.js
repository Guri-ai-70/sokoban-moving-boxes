(function (global, factory) {
  const api = factory(global.SokobanStorage, global.SokobanLevels, global.SokobanRender);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanKeypad = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanStorage, SokobanLevels, SokobanRender) {
  const { getBestResult } = SokobanStorage;
  const { LEVELS } = SokobanLevels;
  const { theme, drawIndicator, viewSize } = SokobanRender;

  function clamp(min, v, max) {
    return Math.max(min, Math.min(max, v));
  }

  // Floor panel layout, derived from the canvas size (not fixed pixels):
  // a tall 2-column panel like a real elevator's on a portrait canvas, a
  // wide 5-column one on a landscape canvas. Drawing and hit-testing both
  // read this one function, so a button can never drift off its hit box.
  function keypadLayout(width, height) {
    const pad = 16;
    const inner = clamp(12, Math.min(width, height) * 0.03, 22);
    const actH = 56;
    const headerH = clamp(84, height * 0.16, 120);
    const cols = height > width ? 2 : 5;
    const rows = Math.ceil(LEVELS.length / cols);

    const availW = width - pad * 2 - inner * 2;
    const availH = height - headerH - pad - inner * 3 - actH;
    // Cells may be wider than tall (a narrow portrait panel still spans the
    // screen width), which keeps every tap target as large as possible.
    const cellH = Math.max(48, Math.min(availH / rows, availW / cols * 1.1, 170));
    const cellW = Math.max(48, Math.min(availW / cols, cellH * 1.8, 190));

    const panelW = cols * cellW + inner * 2;
    const panelH = rows * cellH + inner * 3 + actH;
    const panelX = (width - panelW) / 2;
    const panelY = headerH;
    const gridX = panelX + inner;
    const gridY = panelY + inner;

    const floors = LEVELS.map((lvl, i) => ({
      floor: lvl.floor,
      x: gridX + (i % cols) * cellW,
      y: gridY + Math.floor(i / cols) * cellH,
      w: cellW,
      h: cellH,
    }));

    const actY = gridY + rows * cellH + inner;
    const actW = panelW - inner * 2;
    const gap = 12;
    const resetW = (actW - gap) * 0.42;
    return {
      headerH,
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      floors,
      reset: { x: panelX + inner, y: actY, w: resetW, h: actH },
      accept: { x: panelX + inner + resetW + gap, y: actY, w: actW - resetW - gap, h: actH },
    };
  }

  function inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // Walnut wall panels shared by the lobby and the floor panel screen.
  function drawWallPanels(ctx, width, bottom) {
    const c = theme();
    ctx.fillStyle = c['walnut-900'];
    ctx.fillRect(0, 0, width, viewSize(ctx).height);
    const panelW = clamp(60, width / 8, 120);
    ctx.fillStyle = c['walnut-700'];
    for (let x = 0; x < width; x += panelW) {
      ctx.fillRect(x + 4, 0, panelW - 8, bottom);
    }
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
    const { width, height } = viewSize(ctx);
    const { door, plate, floorY } = lobbyLayout(width, height);

    drawWallPanels(ctx, width, floorY);

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

  // Brass action plate (Reset / Go) on the floor panel.
  function drawPlateButton(ctx, r, label, fill, textColor) {
    const c = theme();
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = c['brass-700'];
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.fillStyle = textColor;
    let px = 16;
    ctx.font = `bold ${px}px ${c['font-ui']}`;
    while (px > 11 && ctx.measureText(label).width > r.w - 16) {
      px--;
      ctx.font = `bold ${px}px ${c['font-ui']}`;
    }
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  }

  // Floor panel: a brass elevator panel with engraved floor buttons. The
  // selected floor's button is lit amber, and the indicator above the
  // panel shows it too. Static -- selection changes colour instantly.
  function renderKeypad(ctx, selectedFloor) {
    const c = theme();
    const { width, height } = viewSize(ctx);
    const L = keypadLayout(width, height);
    const cx = width / 2;

    drawWallPanels(ctx, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // header: floor indicator + caption
    const indH = 40;
    const label = selectedFloor ? String(selectedFloor).padStart(2, '0') : '--';
    drawIndicator(ctx, cx, L.headerH * 0.36, 64, indH, label, 24);
    ctx.fillStyle = c.cream;
    ctx.font = `${clamp(15, width * 0.022, 19)}px ${c['font-ui']}`;
    ctx.fillText(selectedFloor ? `Floor ${selectedFloor} selected - press Go` : 'Select a floor', cx, L.headerH * 0.36 + indH / 2 + 18);

    // panel plate
    const p = L.panel;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(p.x + 4, p.y + 6, p.w, p.h);
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = c['brass-700'];
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x + 1.5, p.y + 1.5, p.w - 3, p.h - 3);
    ctx.strokeStyle = c['brass-300'];
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + 6.5, p.y + 6.5, p.w - 13, p.h - 13);

    // floor buttons
    for (const f of L.floors) {
      const bx = f.x + f.w / 2;
      const by = f.y + f.h * 0.42;
      const r = Math.min(f.w, f.h) * 0.33;
      const lit = selectedFloor === f.floor;

      ctx.beginPath();
      ctx.arc(bx, by, r + Math.max(3, r * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = c['walnut-900'];
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = lit ? c.amber : c['brass-300'];
      ctx.fill();
      ctx.strokeStyle = lit ? c['brass-700'] : c['brass-500'];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = c.ink;
      ctx.font = `bold ${Math.round(r * 0.95)}px ${c['font-num']}`;
      ctx.fillText(String(f.floor), bx, by + 1);

      const best = getBestResult(f.floor);
      if (best) {
        ctx.font = `bold ${clamp(11, f.h * 0.11, 14)}px ${c['font-ui']}`;
        ctx.fillText(`BEST ${best.moves}`, bx, f.y + f.h * 0.88);
      }
    }

    // actions
    drawPlateButton(ctx, L.reset, 'RESET RESULTS', c['walnut-700'], c['brass-300']);
    if (selectedFloor) {
      drawPlateButton(ctx, L.accept, 'GO', c.amber, c.ink);
    } else {
      drawPlateButton(ctx, L.accept, 'GO', c['brass-700'], c['brass-300']);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // A floor's whole grid cell is its tap target (bigger than the drawn
  // circle), which is far easier to hit with a finger.
  function hitTestKeypad(x, y, canvasWidth, canvasHeight) {
    const L = keypadLayout(canvasWidth, canvasHeight);
    for (const f of L.floors) {
      if (inRect(x, y, f)) {
        return { type: 'floor', floor: f.floor };
      }
    }
    if (inRect(x, y, L.reset)) return { type: 'reset' };
    if (inRect(x, y, L.accept)) return { type: 'accept' };
    return null;
  }

  function hitTestCallButton(x, y, canvasWidth, canvasHeight) {
    const btn = callButtonRect(canvasWidth, canvasHeight);
    return inRect(x, y, btn);
  }

  return { renderLobby, renderKeypad, hitTestKeypad, hitTestCallButton };
});
