(function (global, factory) {
  const api = factory(global.SokobanEngine, global.SokobanHud, global.SokobanStorage);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanRender = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanEngine, SokobanHud, SokobanStorage) {
  const { isWon } = SokobanEngine;
  const { formatHud } = SokobanHud;
  const { getMuted } = SokobanStorage;

  const MAX_TILE_SIZE = 48;
  const MIN_TILE_SIZE = 10;
  const HUD_HEIGHT = 32;
  const MUTE_ICON_SIZE = 28;
  const MUTE_ICON_MARGIN = 8;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Like the original 1987 game, a level always fits entirely on one
  // screen — no scrolling. The tile size shrinks to whatever fits the
  // level's width/height into the canvas, instead of a fixed 48px.
  function computeTileSize(state, viewW, viewH) {
    const ts = Math.floor(Math.min(viewW / state.width, viewH / state.height));
    return Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, ts));
  }

  function drawBevelRect(ctx, x, y, w, h, base, light, dark) {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    if (w < 6 || h < 6) return;
    ctx.fillStyle = light;
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);
  }

  const BRICK_ROWS = 3;
  const MORTAR = '#4a0d0f';
  const TOP_RATIO = 0.34;

  function brickRow(ctx, px, y, w, rowH, colors, staggered) {
    const bricksInRow = 2;
    const brickW = w / bricksInRow;
    const offset = staggered ? brickW / 2 : 0;
    for (let i = -1; i < bricksInRow + 1; i++) {
      const x = px + i * brickW + offset;
      const clippedX = Math.max(x, px);
      const clippedRight = Math.min(x + brickW, px + w);
      const bw = clippedRight - clippedX;
      if (bw <= 0) continue;
      drawBevelRect(ctx, clippedX + 1, y + 1, bw - 2, rowH - 2, colors[0], colors[1], colors[2]);
    }
  }

  // Walls render as tall stacked 3D blocks — taller than the box, and
  // viewed from above at an angle skewed to the right (not a flat
  // top-down tile): whenever a wall's top edge is exposed (nothing
  // stacked above it), the block rises above its own grid cell into the
  // row above (a real vertical extrusion, not just a lighter band) with
  // a top face and, wherever its right edge is also exposed, a skewed
  // side face — the same 3-face cube language as the box, just taller.
  const EXTRUSION_RATIO = 0.4;

  function drawWall(ctx, px, py, ts, exposedTop, exposedRight) {
    const sideW = ts * 0.24;
    const extrusion = exposedTop ? ts * EXTRUSION_RATIO : 0;
    const blockTop = py - extrusion;
    const blockH = ts + extrusion;

    ctx.fillStyle = MORTAR;
    ctx.fillRect(px, blockTop, ts, blockH);

    const topH = exposedTop ? ts * TOP_RATIO : 0;
    const frontW = exposedRight ? ts - sideW : ts;

    if (exposedTop) {
      brickRow(ctx, px, blockTop, frontW, topH, ['#d9604a', '#f4977f', '#a83a28']);
      if (exposedRight) {
        ctx.fillStyle = '#c04a36';
        ctx.beginPath();
        ctx.moveTo(px + frontW, blockTop);
        ctx.lineTo(px + ts, blockTop + sideW * 0.6);
        ctx.lineTo(px + ts, blockTop + topH);
        ctx.lineTo(px + frontW, blockTop + topH);
        ctx.closePath();
        ctx.fill();
      }
    }

    const frontY = blockTop + topH;
    const frontH = blockH - topH;
    const rows = exposedTop ? 3 : BRICK_ROWS;
    const rowH = frontH / rows;
    for (let row = 0; row < rows; row++) {
      const y = frontY + row * rowH;
      brickRow(ctx, px, y, frontW, rowH, ['#b8342a', '#d65a44', '#7a1a15'], row % 2 === 1);
    }

    if (exposedRight) {
      const sideRows = exposedTop ? 3 : BRICK_ROWS;
      const sideRowH = frontH / sideRows;
      for (let row = 0; row < sideRows; row++) {
        const y0 = frontY + row * sideRowH;
        const y1 = y0 + sideRowH;
        const skew = sideW * 0.6 * (row / sideRows);
        const skewNext = sideW * 0.6 * ((row + 1) / sideRows);
        ctx.fillStyle = row % 2 === 0 ? '#7a1a15' : '#5c130f';
        ctx.beginPath();
        ctx.moveTo(px + frontW, y0);
        ctx.lineTo(px + ts, y0 - skew + sideW * 0.6);
        ctx.lineTo(px + ts, y1 - skewNext + sideW * 0.6);
        ctx.lineTo(px + frontW, y1);
        ctx.closePath();
        ctx.fill();
        if (ts >= 16) {
          ctx.strokeStyle = '#2a0507';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    if (exposedTop) {
      ctx.strokeStyle = '#5c140c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, frontY + 0.5);
      ctx.lineTo(px + frontW, frontY + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = '#2a0507';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, blockTop + 0.5, ts - 1, blockH - 1);
  }

  function drawTarget(ctx, px, py, ts) {
    ctx.fillStyle = cssVar('--sb-cyan');
    ctx.fillRect(px, py, ts, ts);
    ctx.strokeStyle = cssVar('--sb-target');
    ctx.lineWidth = 2;
    const cx = px + ts / 2;
    const cy = py + ts / 2;
    const r = ts / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.stroke();
  }

  function drawBox(ctx, px, py, ts, onTarget) {
    const margin = Math.max(2, ts * 0.1);
    const size = ts - margin * 2;
    const depth = size * 0.28;
    const x = px + margin;
    const y = py + margin + depth;
    const front = size - depth;

    const front_c = onTarget ? '#e0a83a' : '#8a5a2a';
    const top_c = onTarget ? '#f6cf72' : '#b07f47';
    const side_c = onTarget ? '#a87a1f' : '#5c3a18';
    const line_c = onTarget ? '#6b4a10' : '#2e1a0a';

    ctx.strokeStyle = line_c;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    // top face
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + depth, y - depth);
    ctx.lineTo(x + depth + front, y - depth);
    ctx.lineTo(x + front, y);
    ctx.closePath();
    ctx.fillStyle = top_c;
    ctx.fill();
    ctx.stroke();

    // side (right) face
    ctx.beginPath();
    ctx.moveTo(x + front, y);
    ctx.lineTo(x + depth + front, y - depth);
    ctx.lineTo(x + depth + front, y - depth + front);
    ctx.lineTo(x + front, y + front);
    ctx.closePath();
    ctx.fillStyle = side_c;
    ctx.fill();
    ctx.stroke();

    // front face
    ctx.fillStyle = front_c;
    ctx.fillRect(x, y, front, front);
    ctx.strokeRect(x, y, front, front);
  }

  function drawPlayer(ctx, px, py, ts) {
    const cx = px + ts / 2;
    const headR = ts * 0.16;
    const headCy = py + ts * 0.28;
    const bodyTop = py + ts * 0.4;
    const bodyW = ts * 0.42;
    const bodyH = ts * 0.34;
    const legW = ts * 0.16;
    const legH = ts * 0.2;
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
    const viewW = canvas.width;
    const viewH = canvas.height - HUD_HEIGHT;

    ctx.fillStyle = cssVar('--sb-cyan');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const ts = computeTileSize(state, viewW, viewH);
    const levelPxW = state.width * ts;
    const levelPxH = state.height * ts;

    // Levels normally shrink to fit the whole thing on screen, like the
    // original — no scrolling. Only a level too large to stay legible even
    // at MIN_TILE_SIZE falls back to a camera centered on the player.
    const fitsW = levelPxW <= viewW;
    const fitsH = levelPxH <= viewH;
    const offsetX = fitsW ? (viewW - levelPxW) / 2 : viewW / 2 - (state.player.x + 0.5) * ts;
    const offsetY = fitsH ? (viewH - levelPxH) / 2 : viewH / 2 - (state.player.y + 0.5) * ts;
    const clampedX = fitsW ? offsetX : Math.min(0, Math.max(viewW - levelPxW, offsetX));
    const clampedY = fitsH ? offsetY : Math.min(0, Math.max(viewH - levelPxH, offsetY));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewW, viewH);
    ctx.clip();
    ctx.translate(clampedX, clampedY);

    // Walls first (their tops extrude upward into the row above, drawn
    // top-to-bottom so a taller wall correctly overdraws whatever's just
    // above it). Targets are drawn in their own pass afterward — they're
    // flat floor markings, so they must never end up partly covered by a
    // neighboring wall's extrusion the way they would if drawn in the
    // same pass.
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const k = `${x},${y}`;
        if (state.walls.has(k)) {
          const exposedTop = !state.walls.has(`${x},${y - 1}`);
          const exposedRight = !state.walls.has(`${x + 1},${y}`);
          drawWall(ctx, x * ts, y * ts, ts, exposedTop, exposedRight);
        }
      }
    }

    for (const t of state.targets) {
      const [x, y] = t.split(',').map(Number);
      drawTarget(ctx, x * ts, y * ts, ts);
    }

    for (const b of state.boxes) {
      const [x, y] = b.split(',').map(Number);
      drawBox(ctx, x * ts, y * ts, ts, state.targets.has(b));
    }

    drawPlayer(ctx, state.player.x * ts, state.player.y * ts, ts);

    ctx.restore();

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

  return { muteIconRect, renderLevel };
});
