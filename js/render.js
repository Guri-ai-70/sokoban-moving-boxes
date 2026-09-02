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

  function drawBevelRect(ctx, x, y, w, h, base, light, dark) {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
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

  // Walls render as extruded blocks viewed at a slight angle: a lighter,
  // foreshortened "top" face where the block's top edge is actually
  // exposed (nothing stacked above it), and the regular brick "front"
  // face below — this is what reads as 3D instead of a flat top-down tile.
  function drawWall(ctx, px, py, exposedTop, exposedRight) {
    ctx.fillStyle = MORTAR;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    const topH = exposedTop ? TILE_SIZE * TOP_RATIO : 0;
    if (exposedTop) {
      brickRow(ctx, px, py, TILE_SIZE, topH, ['#d9604a', '#f4977f', '#a83a28']);
    }

    const frontY = py + topH;
    const frontH = TILE_SIZE - topH;
    const rows = exposedTop ? 2 : BRICK_ROWS;
    const rowH = frontH / rows;
    for (let row = 0; row < rows; row++) {
      const y = frontY + row * rowH;
      brickRow(ctx, px, y, TILE_SIZE, rowH, ['#b8342a', '#d65a44', '#7a1a15'], row % 2 === 1);
    }

    if (exposedRight) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(px + TILE_SIZE - 5, frontY, 5, frontH);
    }

    if (exposedTop) {
      ctx.strokeStyle = '#5c140c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, frontY + 0.5);
      ctx.lineTo(px + TILE_SIZE, frontY + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = '#2a0507';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
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
    const margin = 5;
    const size = TILE_SIZE - margin * 2;
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
          const exposedTop = !state.walls.has(`${x},${y - 1}`);
          const exposedRight = !state.walls.has(`${x + 1},${y}`);
          drawWall(ctx, px, py, exposedTop, exposedRight);
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
