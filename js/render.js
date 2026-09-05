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

  // The level text's bounding rectangle is wider than the actual room —
  // an irregular room (an L-shaped floor, a side chamber) pads the
  // unused corners out to '#' so every row is the same length. Those
  // padding cells are still walls for collision, but they were never a
  // real wall in the source level, so they must not render as brick.
  //
  // A '#' cell is a real wall face only if a floor cell touches it —
  // checked in all 8 directions (including diagonals), not just the 4
  // orthogonal ones, so a corner cell (diagonally touching the floor
  // just inside it, with only wall on its own row and column) still
  // closes the perimeter instead of reading as a gap. There is no
  // special case for the outer edge of the grid: the actual room is
  // frequently narrower than the padded rectangle in a given row or
  // column, and treating every edge cell as automatically real would
  // draw a full rectangular border past where the room actually
  // reaches — exactly the extra "blocks to complete a rectangle" this
  // is meant to avoid. A '#' cell with no floor anywhere in its 8
  // neighbors is padding — it renders as plain background instead, so
  // the room reads as its own stepped, bounded shape.
  function isRealWall(state, x, y) {
    if (!state.walls.has(`${x},${y}`)) return false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        // Off the grid entirely is never floor -- without this check an
        // edge cell's out-of-bounds neighbor (never added to the walls
        // set) would look exactly like an open floor cell, making every
        // outer-edge wall "real" again regardless of the room's actual
        // shape there.
        if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
        if (!state.walls.has(`${nx},${ny}`)) return true;
      }
    }
    return false;
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

  // Walls render as a single flat brick tile, matching the tile grid
  // exactly (no raised top face) -- an earlier version extruded the top
  // of a wall upward into the row above for a 3D "taller than the box"
  // look, but that read as a second, lighter brick stacked on the real
  // one rather than as depth, so it's gone. A skewed side face is kept
  // wherever a wall's right edge is exposed, as a cheaper depth cue that
  // doesn't add a fake extra course above the block.
  function drawWall(ctx, px, py, ts, exposedRight) {
    const sideW = ts * 0.24;

    ctx.fillStyle = MORTAR;
    ctx.fillRect(px, py, ts, ts);

    const frontW = exposedRight ? ts - sideW : ts;

    const rows = BRICK_ROWS;
    const rowH = ts / rows;
    for (let row = 0; row < rows; row++) {
      const y = py + row * rowH;
      brickRow(ctx, px, y, frontW, rowH, ['#b8342a', '#d65a44', '#7a1a15'], row % 2 === 1);
    }

    if (exposedRight) {
      const sideRows = BRICK_ROWS;
      const sideRowH = ts / sideRows;
      for (let row = 0; row < sideRows; row++) {
        const y0 = py + row * sideRowH;
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

    ctx.strokeStyle = '#2a0507';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
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

  // Woven-crate texture (X crosshatch + a diamond in the middle) on a
  // pale base — matches the reference screenshots' box art, which is a
  // basket-weave crate, not a plain painted cube.
  function drawWoven(ctx, x, y, w, h, lineColor) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = Math.max(1, w * 0.07);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
    ctx.stroke();
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.min(w, h) * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.stroke();
  }

  function drawBox(ctx, px, py, ts, onTarget) {
    const margin = Math.max(2, ts * 0.08);
    const size = ts - margin * 2;
    const depth = size * 0.22;
    const x = px + margin;
    const y = py + margin + depth;
    const front = size - depth;

    // A box on its target used to switch to a warm gold tone -- close
    // enough to the wall's warm red-brown that at a glance (or scaled
    // down) it read as another brick rather than a box. Green has no
    // other user in this palette (walls are red, floor/off-target boxes
    // are cyan), so it can't be confused with either.
    const base_c = onTarget ? '#8fd68c' : '#cdeef1';
    const top_c = onTarget ? '#c3f0c0' : '#e6f8f9';
    const side_c = onTarget ? '#5fae5c' : '#a9d6d9';
    const line_c = onTarget ? '#1f5c1f' : '#1a2e30';

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

    // front face — the woven crate texture
    ctx.fillStyle = base_c;
    ctx.fillRect(x, y, front, front);
    ctx.strokeRect(x, y, front, front);
    drawWoven(ctx, x + 1, y + 1, front - 2, front - 2, line_c);
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

  // Shared by renderLevel and main.js's click-to-move handling, so a click
  // maps to the same grid cell the level is actually drawn at -- computed
  // once here instead of re-derived (and risking drift) in two places.
  function computeViewTransform(state, viewW, viewH) {
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

    return { ts, offsetX: clampedX, offsetY: clampedY };
  }

  // hideBoxes: used for the brief post-win celebration blink (every box
  // is on its target at that point) -- skipping the box draw on the
  // "off" frames leaves the target diamond showing through underneath,
  // which reads as the box flashing rather than the level re-rendering
  // from scratch each time.
  function renderLevel(ctx, state, floor, moves, pushes, elapsedMs, hideBoxes) {
    const canvas = ctx.canvas;
    const viewW = canvas.width;
    const viewH = canvas.height - HUD_HEIGHT;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { ts, offsetX: clampedX, offsetY: clampedY } = computeViewTransform(state, viewW, viewH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewW, viewH);
    ctx.clip();
    ctx.translate(clampedX, clampedY);

    // Walls first, floor drawn over them afterward.
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (isRealWall(state, x, y)) {
          const exposedRight = !isRealWall(state, x + 1, y);
          drawWall(ctx, x * ts, y * ts, ts, exposedRight);
        }
      }
    }

    // Floor next, on top of walls rather than under them, so it stays
    // clean regardless of draw order elsewhere. Filling every real floor
    // cell (including ones a box/target/player sits on) after the walls
    // guarantees a clean floor everywhere, regardless of what's drawn on
    // it next. A '#' cell that isn't a real wall (see isRealWall) is
    // padding outside the room's actual shape and is left on the black
    // canvas background instead, so an irregular room reads as its own
    // bounded shape.
    ctx.fillStyle = cssVar('--sb-cyan');
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (!state.walls.has(`${x},${y}`)) ctx.fillRect(x * ts, y * ts, ts, ts);
      }
    }

    for (const t of state.targets) {
      const [x, y] = t.split(',').map(Number);
      drawTarget(ctx, x * ts, y * ts, ts);
    }

    if (!hideBoxes) {
      for (const b of state.boxes) {
        const [x, y] = b.split(',').map(Number);
        drawBox(ctx, x * ts, y * ts, ts, state.targets.has(b));
      }
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

  const BALLOON_COLORS = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
  const BALLOON_COUNT = 10;

  function drawBalloon(ctx, x, y, size, color) {
    // string
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.62);
    ctx.lineTo(x, y + size * 0.62 + 26);
    ctx.stroke();

    // knot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + size * 0.56);
    ctx.lineTo(x + 3, y + size * 0.56);
    ctx.lineTo(x, y + size * 0.56 + 6);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.5, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.16, y - size * 0.22, size * 0.12, size * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Balloons drift upward from below the screen and loop, each on its own
  // horizontal lane and speed so the celebration keeps going for as long
  // as the complete screen is shown, not just a one-shot burst.
  function renderComplete(ctx, stats, tMs) {
    const canvas = ctx.canvas;
    const { width, height } = canvas;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < BALLOON_COUNT; i++) {
      const laneX = ((i + 0.5) / BALLOON_COUNT) * width;
      const speed = 55 + (i % 5) * 14;
      const cycle = height + 120;
      const y = height - ((tMs / 1000 * speed + i * 71) % cycle) + 40;
      const wobble = Math.sin(tMs / 450 + i * 1.7) * 16;
      drawBalloon(ctx, laneX + wobble, y, 34, BALLOON_COLORS[i % BALLOON_COLORS.length]);
    }

    ctx.fillStyle = '#35e0e8';
    ctx.font = '28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Floor Complete!', width / 2, height / 2 - 40);
    ctx.font = '18px "Courier New", monospace';
    ctx.fillText(
      `moves:${stats.moves}  pushes:${stats.pushes}  time:${Math.round(stats.timeMs / 1000)}s`,
      width / 2, height / 2
    );
    ctx.fillText('Click to return to the elevator', width / 2, height / 2 + 40);
    ctx.textAlign = 'left';
  }

  return { muteIconRect, renderLevel, renderComplete, computeViewTransform, HUD_HEIGHT };
});
