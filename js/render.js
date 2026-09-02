(function (global, factory) {
  const api = factory(global.SokobanEngine, global.SokobanHud, global.SokobanStorage);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanRender = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanEngine, SokobanHud, SokobanStorage) {
  const { isWon } = SokobanEngine;
  const { formatHud } = SokobanHud;
  const { getMuted } = SokobanStorage;

  const TILE_SIZE = 48;
  const HUD_HEIGHT = 32;
  const MUTE_ICON_SIZE = 28;
  const MUTE_ICON_MARGIN = 8;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function drawWall(ctx, px, py) {
    ctx.fillStyle = cssVar('--sb-brick');
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = cssVar('--sb-brick-dark');
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.beginPath();
    ctx.moveTo(px, py + TILE_SIZE / 2);
    ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
    ctx.stroke();
  }

  function drawTarget(ctx, px, py) {
    ctx.fillStyle = cssVar('--sb-cyan');
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = cssVar('--sb-target');
    ctx.lineWidth = 2;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const r = TILE_SIZE / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.stroke();
  }

  function drawBox(ctx, px, py, onTarget) {
    ctx.fillStyle = onTarget ? '#e0a83a' : '#8a5a2a';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.strokeStyle = '#3a2510';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
  }

  function drawPlayer(ctx, px, py) {
    const cx = px + TILE_SIZE / 2;
    const headR = TILE_SIZE * 0.16;
    const headCy = py + TILE_SIZE * 0.28;
    const bodyTop = py + TILE_SIZE * 0.4;
    const bodyW = TILE_SIZE * 0.42;
    const bodyH = TILE_SIZE * 0.34;
    const legW = TILE_SIZE * 0.16;
    const legH = TILE_SIZE * 0.2;
    const legY = bodyTop + bodyH;

    // legs
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(cx - bodyW / 2, legY, legW, legH);
    ctx.fillRect(cx + bodyW / 2 - legW, legY, legW, legH);

    // body (shirt)
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    ctx.strokeStyle = '#5a1a12';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);

    // head
    ctx.fillStyle = cssVar('--sb-player');
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function muteIconRect(canvasWidth) {
    return {
      x: canvasWidth - MUTE_ICON_SIZE - MUTE_ICON_MARGIN,
      y: MUTE_ICON_MARGIN,
      w: MUTE_ICON_SIZE,
      h: MUTE_ICON_SIZE,
    };
  }

  function drawMuteIcon(ctx, canvasWidth) {
    const r = muteIconRect(canvasWidth);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.font = '18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = getMuted() ? '#888' : cssVar('--sb-hud-text');
    ctx.fillText(getMuted() ? 'MUTE' : 'SND', r.x + r.w / 2, r.y + r.h / 2 + 5);
    ctx.textAlign = 'left';
  }

  function renderLevel(ctx, state, floor, moves, pushes, elapsedMs) {
    const canvas = ctx.canvas;
    ctx.fillStyle = cssVar('--sb-cyan');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const k = `${x},${y}`;
        if (state.walls.has(k)) {
          drawWall(ctx, px, py);
        } else if (state.targets.has(k)) {
          drawTarget(ctx, px, py);
        }
      }
    }

    for (const b of state.boxes) {
      const [x, y] = b.split(',').map(Number);
      drawBox(ctx, x * TILE_SIZE, y * TILE_SIZE, state.targets.has(b));
    }

    drawPlayer(ctx, state.player.x * TILE_SIZE, state.player.y * TILE_SIZE);

    const hudY = canvas.height - HUD_HEIGHT;
    ctx.fillStyle = cssVar('--sb-hud-bg');
    ctx.fillRect(0, hudY, canvas.width, HUD_HEIGHT);
    ctx.fillStyle = cssVar('--sb-hud-text');
    ctx.font = '18px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatHud(floor, moves, pushes, elapsedMs), 8, hudY + HUD_HEIGHT / 2);
    ctx.textBaseline = 'alphabetic';

    drawMuteIcon(ctx, canvas.width);

    return isWon(state);
  }

  return { TILE_SIZE, muteIconRect, renderLevel };
});
