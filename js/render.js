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
  const HUD_HEIGHT = 40;
  const MUTE_ICON_SIZE = 28;
  const MUTE_ICON_MARGIN = 8;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Brass & Terrazzo colours/fonts live as CSS custom properties (see
  // DESIGN.md). They never change at runtime, so read them once instead
  // of calling getComputedStyle for every tile on every frame.
  let theme = null;
  function T() {
    if (!theme) {
      theme = {};
      for (const name of [
        'walnut-900', 'walnut-700', 'walnut-500', 'brass-300', 'brass-500', 'brass-700',
        'amber', 'cream', 'chip-1', 'chip-2', 'chip-3', 'charcoal', 'oak', 'oak-dark', 'ink',
        'font-ui', 'font-num',
      ]) {
        theme[name] = cssVar(`--bt-${name}`);
      }
    }
    return theme;
  }

  // Deterministic per-cell noise in [0, 1), so terrazzo chips and wood
  // grain sit in the same place every frame instead of shimmering.
  function cellRand(x, y, i) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(i, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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

  // Walnut wall block: a recessed panel outline and a little grain, with a
  // brass cap along any top edge that faces open floor.
  function drawWall(ctx, gx, gy, ts, capTop) {
    const c = T();
    const px = gx * ts, py = gy * ts;
    ctx.fillStyle = c['walnut-700'];
    ctx.fillRect(px, py, ts, ts);

    if (ts >= 14) {
      ctx.strokeStyle = c['walnut-500'];
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const lineX = Math.round(px + ts * (0.2 + 0.6 * cellRand(gx, gy, i))) + 0.5;
        ctx.beginPath();
        ctx.moveTo(lineX, py + ts * 0.15);
        ctx.lineTo(lineX, py + ts * 0.85);
        ctx.stroke();
      }
      const inset = Math.round(ts * 0.14);
      ctx.strokeStyle = c['walnut-900'];
      ctx.strokeRect(px + inset + 0.5, py + inset + 0.5, ts - inset * 2 - 1, ts - inset * 2 - 1);
    }

    if (capTop) {
      const capH = Math.max(2, Math.round(ts * 0.1));
      ctx.fillStyle = c['brass-500'];
      ctx.fillRect(px, py, ts, capH);
      ctx.fillStyle = c['brass-300'];
      ctx.fillRect(px, py, ts, 1);
    }
  }

  // Cream terrazzo tile with scattered chips and a thin brass divider
  // strip on its top/left edge, so the floor reads as a countable grid.
  function drawFloor(ctx, gx, gy, ts, shadowTop) {
    const c = T();
    const px = gx * ts, py = gy * ts;
    ctx.fillStyle = c.cream;
    ctx.fillRect(px, py, ts, ts);

    if (ts >= 14) {
      const chips = [c['chip-1'], c['chip-2'], c['chip-3']];
      for (let i = 0; i < 6; i++) {
        const size = Math.max(1.5, ts * (0.04 + 0.05 * cellRand(gx, gy, i + 20)));
        ctx.fillStyle = chips[i % 3];
        ctx.fillRect(
          px + (ts - size) * cellRand(gx, gy, i),
          py + (ts - size) * cellRand(gx, gy, i + 10),
          size, size
        );
      }
    }

    // A wall directly above casts a band of shade onto the floor below it.
    if (shadowTop) {
      ctx.fillStyle = 'rgba(28, 18, 11, 0.22)';
      ctx.fillRect(px, py, ts, Math.max(2, ts * 0.14));
    }

    ctx.fillStyle = 'rgba(138, 100, 39, 0.45)';
    ctx.fillRect(px, py, ts, 1);
    ctx.fillRect(px, py, 1, ts);
  }

  // Inlaid brass ring medallion.
  function drawTarget(ctx, px, py, ts) {
    const c = T();
    const cx = px + ts / 2, cy = py + ts / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.3, 0, Math.PI * 2);
    ctx.strokeStyle = c['brass-700'];
    ctx.lineWidth = Math.max(2, ts * 0.1);
    ctx.stroke();
    ctx.strokeStyle = c['brass-500'];
    ctx.lineWidth = Math.max(1, ts * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.5, ts * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = c['brass-700'];
    ctx.fill();
  }

  // Oak crate with slats and brass corner plates. On its target it turns
  // into a lit brass crate -- much brighter, not just a hue shift, so the
  // solved state reads at a glance and at tiny tile sizes.
  function drawBox(ctx, px, py, ts, onTarget) {
    const c = T();
    const m = Math.max(2, Math.round(ts * 0.09));
    const x = px + m, y = py + m, s = ts - m * 2;

    ctx.fillStyle = 'rgba(28, 18, 11, 0.28)';
    ctx.fillRect(x + Math.max(1, ts * 0.05), y + Math.max(1, ts * 0.06), s, s);

    ctx.fillStyle = onTarget ? c['brass-300'] : c.oak;
    ctx.fillRect(x, y, s, s);

    ctx.strokeStyle = onTarget ? c['brass-700'] : c['oak-dark'];
    ctx.lineWidth = Math.max(1, ts * 0.05);
    ctx.strokeRect(x, y, s, s);

    if (ts >= 14) {
      ctx.lineWidth = Math.max(1, ts * 0.03);
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) {
        ctx.moveTo(x, y + s * f);
        ctx.lineTo(x + s, y + s * f);
      }
      ctx.stroke();

      const k = Math.max(3, Math.round(s * 0.2));
      ctx.fillStyle = onTarget ? c.amber : c['brass-500'];
      for (const [kx, ky] of [[x, y], [x + s - k, y], [x, y + s - k], [x + s - k, y + s - k]]) {
        ctx.fillRect(kx, ky, k, k);
      }
    }
  }

  // Bellhop: burgundy jacket with brass buttons and a pillbox cap.
  function drawPlayer(ctx, px, py, ts) {
    const c = T();
    const cx = px + ts / 2;
    const headR = ts * 0.15;
    const headCy = py + ts * 0.3;
    const bodyTop = py + ts * 0.44;
    const bodyW = ts * 0.44;
    const bodyH = ts * 0.32;
    const legW = ts * 0.15;
    const legH = ts * 0.16;
    const legY = bodyTop + bodyH;

    ctx.fillStyle = 'rgba(28, 18, 11, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, legY + legH, bodyW * 0.55, ts * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.charcoal;
    ctx.fillRect(cx - bodyW / 2 + ts * 0.03, legY, legW, legH);
    ctx.fillRect(cx + bodyW / 2 - legW - ts * 0.03, legY, legW, legH);

    ctx.fillStyle = '#7d1f2c';
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    ctx.strokeStyle = '#3d0d14';
    ctx.lineWidth = Math.max(1, ts * 0.03);
    ctx.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    if (ts >= 14) {
      ctx.fillStyle = c['brass-300'];
      const b = Math.max(1.5, ts * 0.05);
      ctx.fillRect(cx - b / 2, bodyTop + bodyH * 0.25, b, b);
      ctx.fillRect(cx - b / 2, bodyTop + bodyH * 0.6, b, b);
    }

    ctx.fillStyle = '#e9c7a0';
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // pillbox cap with a brass band
    const capW = headR * 1.7, capH = headR * 0.9;
    ctx.fillStyle = '#7d1f2c';
    ctx.fillRect(cx - capW / 2, headCy - headR - capH * 0.55, capW, capH);
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(cx - capW / 2, headCy - headR + capH * 0.2, capW, Math.max(1, capH * 0.25));
  }

  function muteIconRect(canvasWidth) {
    return {
      x: canvasWidth - MUTE_ICON_SIZE - MUTE_ICON_MARGIN,
      y: MUTE_ICON_MARGIN,
      w: MUTE_ICON_SIZE,
      h: MUTE_ICON_SIZE,
    };
  }

  // Interim brass-plate restyle of the existing mute toggle; a full-size
  // HTML button replaces it later (see the redesign plan, step 8).
  function drawMuteIcon(ctx, canvasWidth) {
    const c = T();
    const r = muteIconRect(canvasWidth);
    ctx.fillStyle = getMuted() ? c['walnut-700'] : c['brass-500'];
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = c['brass-700'];
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.font = `bold 10px ${c['font-num']}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getMuted() ? c['brass-300'] : c.ink;
    ctx.fillText(getMuted() ? 'MUTE' : 'SND', r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // HUD: a charcoal strip like the indicator band above elevator doors --
  // an amber-lit floor number in a brass frame, then the counters. The
  // text itself still comes from formatHud (js/hud.js), split into parts.
  function drawHud(ctx, floor, moves, pushes, elapsedMs) {
    const c = T();
    const { width, height } = ctx.canvas;
    const y = height - HUD_HEIGHT;
    const mid = y + HUD_HEIGHT / 2;

    ctx.fillStyle = c.charcoal;
    ctx.fillRect(0, y, width, HUD_HEIGHT);
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(0, y, width, 2);

    const [floorText, rest] = formatHud(floor, moves, pushes, elapsedMs).split('|');
    const fields = rest.split(' ').map((f) => {
      const i = f.indexOf(':');
      return { label: f.slice(0, i).toUpperCase(), value: f.slice(i + 1) };
    });

    const boxW = 52, boxH = HUD_HEIGHT - 12;
    ctx.fillStyle = c['walnut-900'];
    ctx.fillRect(8, y + 7, boxW, boxH);
    ctx.strokeStyle = c['brass-500'];
    ctx.lineWidth = 2;
    ctx.strokeRect(8, y + 7, boxW, boxH);
    ctx.fillStyle = c.amber;
    ctx.font = `bold 20px ${c['font-num']}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(floorText, 8 + boxW / 2, mid + 1);

    ctx.textAlign = 'left';
    let x = 8 + boxW + 20;
    for (const { label, value } of fields) {
      ctx.font = `bold 12px ${c['font-ui']}`;
      ctx.fillStyle = c['brass-300'];
      ctx.fillText(label, x, mid + 1);
      x += ctx.measureText(label).width + 8;
      ctx.font = `18px ${c['font-num']}`;
      ctx.fillStyle = c.cream;
      ctx.fillText(value, x, mid + 1);
      x += ctx.measureText(value).width + 24;
    }
    ctx.textBaseline = 'alphabetic';
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

  function renderLevel(ctx, state, floor, moves, pushes, elapsedMs) {
    const canvas = ctx.canvas;
    const viewW = canvas.width;
    const viewH = canvas.height - HUD_HEIGHT;

    ctx.fillStyle = T()['walnut-900'];
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { ts, offsetX: clampedX, offsetY: clampedY } = computeViewTransform(state, viewW, viewH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewW, viewH);
    ctx.clip();
    ctx.translate(clampedX, clampedY);

    // A '#' cell that isn't a real wall (see isRealWall) is padding outside
    // the room's actual shape and is left as plain background, so an
    // irregular room reads as its own bounded shape.
    const isFloor = (x, y) =>
      x >= 0 && y >= 0 && x < state.width && y < state.height && !state.walls.has(`${x},${y}`);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (isFloor(x, y)) {
          drawFloor(ctx, x, y, ts, isRealWall(state, x, y - 1));
        } else if (isRealWall(state, x, y)) {
          drawWall(ctx, x, y, ts, isFloor(x, y - 1));
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

    drawHud(ctx, floor, moves, pushes, elapsedMs);
    drawMuteIcon(ctx, canvas.width);

    return isWon(state);
  }

  // Static win screen (no animation, see DESIGN.md).
  function renderComplete(ctx, stats) {
    const canvas = ctx.canvas;
    const { width, height } = canvas;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

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
