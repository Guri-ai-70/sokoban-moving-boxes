(function (global, factory) {
  const api = factory(global.SokobanEngine, global.SokobanHud);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanRender = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanEngine, SokobanHud) {
  const { isWon } = SokobanEngine;
  const { formatHud } = SokobanHud;

  // The canvas now fills the whole play area (see main.js), so tiles may
  // grow well past the old 48px on a big desktop window.
  const MAX_TILE_SIZE = 96;
  const MIN_TILE_SIZE = 10;
  const HUD_HEIGHT = 44;

  // The canvas's drawing buffer is its CSS size times the device pixel
  // ratio (sharp on high-DPI screens); main.js scales the context by that
  // ratio, so every renderer works in CSS pixels via viewSize().
  let pixelRatio = 1;
  function setPixelRatio(ratio) {
    pixelRatio = ratio;
  }
  function viewSize(ctx) {
    return { width: ctx.canvas.width / pixelRatio, height: ctx.canvas.height / pixelRatio };
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Theme colours/fonts live as CSS custom properties (see DESIGN.md);
  // the crate style is a data-crate attribute on <html>. Both only change
  // when the settings panel says so (refreshTheme), so read them once
  // instead of calling getComputedStyle for every tile on every frame.
  let theme = null;
  function T() {
    if (!theme) {
      theme = {};
      for (const name of [
        'walnut-900', 'walnut-700', 'walnut-500', 'brass-300', 'brass-500', 'brass-700',
        'amber', 'cream', 'chip-1', 'chip-2', 'chip-3', 'charcoal', 'oak', 'oak-dark', 'ink',
        'lit', 'lit-edge', 'lit-metal', 'font-ui', 'font-num',
      ]) {
        theme[name] = cssVar(`--bt-${name}`);
      }
      theme.crate = document.documentElement.dataset.crate || 'oak';
    }
    return theme;
  }

  function refreshTheme() {
    theme = null;
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

  // Crates come in three styles (settings panel). Every style turns into
  // a lit crate on its target -- a much brighter body (--bt-lit), not
  // just a hue shift, so the solved state reads at a glance, on light and
  // dark floors alike and at tiny tile sizes.
  const CRATE_STYLES = {
    // Oak crate: slats and metal corner plates.
    oak(ctx, x, y, s, ts, lit, c) {
      ctx.fillStyle = lit ? c.lit : c.oak;
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = lit ? c['lit-edge'] : c['oak-dark'];
      ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.strokeRect(x, y, s, s);
      if (ts < 14) return;
      ctx.lineWidth = Math.max(1, ts * 0.03);
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) {
        ctx.moveTo(x, y + s * f);
        ctx.lineTo(x + s, y + s * f);
      }
      ctx.stroke();
      const k = Math.max(3, Math.round(s * 0.2));
      ctx.fillStyle = lit ? c['lit-metal'] : c['brass-500'];
      for (const [kx, ky] of [[x, y], [x + s - k, y], [x, y + s - k], [x + s - k, y + s - k]]) {
        ctx.fillRect(kx, ky, k, k);
      }
    },

    // Parcel: kraft box with a tape strip; lit = bright box, light tape
    // and a round seal in the middle.
    parcel(ctx, x, y, s, ts, lit, c) {
      const edge = lit ? c['lit-edge'] : '#7d5a35';
      ctx.fillStyle = lit ? c.lit : '#c8a073';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.strokeRect(x, y, s, s);
      if (ts < 14) return;
      const tw = s * 0.24;
      ctx.fillStyle = lit ? c['lit-metal'] : '#e6d3a8';
      ctx.fillRect(x + (s - tw) / 2, y, tw, s);
      ctx.lineWidth = Math.max(1, ts * 0.02);
      ctx.strokeRect(x + (s - tw) / 2, y, tw, s);
      if (lit) {
        ctx.beginPath();
        ctx.arc(x + s / 2, y + s / 2, s * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = c.lit;
        ctx.fill();
        ctx.lineWidth = Math.max(1, ts * 0.04);
        ctx.stroke();
      }
    },

    // Steamer trunk: dark leather, two metal bands, rivets, a lid seam.
    // Lit = the whole trunk lights up, bands go dark for contrast.
    trunk(ctx, x, y, s, ts, lit, c) {
      ctx.fillStyle = lit ? c.lit : '#4a2c1e';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = lit ? c['lit-edge'] : '#1f110a';
      ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.strokeRect(x, y, s, s);
      if (ts < 14) return;
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.32);
      ctx.lineTo(x + s, y + s * 0.32);
      ctx.lineWidth = Math.max(1, ts * 0.03);
      ctx.stroke();
      const bw = Math.max(2, s * 0.12);
      ctx.fillStyle = lit ? c['lit-edge'] : c['brass-500'];
      for (const f of [0.22, 0.78]) ctx.fillRect(x + s * f - bw / 2, y, bw, s);
      const rv = Math.max(2, s * 0.08);
      ctx.fillStyle = lit ? c['lit-metal'] : c['brass-300'];
      for (const f of [0.22, 0.78]) {
        for (const g of [0.14, 0.86]) {
          ctx.fillRect(x + s * f - rv / 2, y + s * g - rv / 2, rv, rv);
        }
      }
    },
  };

  function drawBox(ctx, px, py, ts, onTarget, style) {
    const c = T();
    const m = Math.max(2, Math.round(ts * 0.09));
    const x = px + m, y = py + m, s = ts - m * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(x + Math.max(1, ts * 0.05), y + Math.max(1, ts * 0.06), s, s);

    const draw = CRATE_STYLES[style || c.crate] || CRATE_STYLES.oak;
    draw(ctx, x, y, s, ts, onTarget, c);
  }

  // Settings-panel preview: one floor tile with a crate, one with a crate
  // on its target, in the current theme, drawn at the screen's pixel ratio.
  function renderCrateSample(canvas, cssW, cssH, style) {
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const ts = cssH;
    drawFloor(ctx, 0, 0, ts, false);
    drawFloor(ctx, 1, 0, ts, false);
    drawBox(ctx, 0, 0, ts, false, style);
    drawTarget(ctx, ts, 0, ts);
    drawBox(ctx, ts, 0, ts, true, style);
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

  // Splits formatHud's "01|moves:0000 pushes:0000 time:0:00:00" into the
  // floor number and labelled fields, so the HUD and the win card share
  // one source of truth for number/time formatting (js/hud.js).
  function hudParts(floor, moves, pushes, elapsedMs) {
    const [floorText, rest] = formatHud(floor, moves, pushes, elapsedMs).split('|');
    const fields = rest.split(' ').map((f) => {
      const i = f.indexOf(':');
      return { label: f.slice(0, i).toUpperCase(), value: f.slice(i + 1) };
    });
    return { floorText, fields };
  }

  // Amber-lit floor number in a brass frame, like the indicator above
  // elevator doors. Used by the HUD and the win card.
  function drawIndicator(ctx, cx, cy, w, h, text, fontPx) {
    const c = T();
    ctx.fillStyle = c['walnut-900'];
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = c['brass-500'];
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = c.amber;
    ctx.font = `bold ${fontPx}px ${c['font-num']}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);
  }

  // HUD: a charcoal strip like the indicator band above elevator doors --
  // an amber-lit floor number in a brass frame, then the counters, each a
  // small label over its value so all three fit even on a phone. The text
  // itself still comes from formatHud (js/hud.js), split into parts.
  function drawHud(ctx, floor, moves, pushes, elapsedMs) {
    const c = T();
    const { width, height } = viewSize(ctx);
    const y = height - HUD_HEIGHT;
    const mid = y + HUD_HEIGHT / 2;

    ctx.fillStyle = c.charcoal;
    ctx.fillRect(0, y, width, HUD_HEIGHT);
    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(0, y, width, 2);

    const { floorText, fields } = hudParts(floor, moves, pushes, elapsedMs);

    const boxW = 52;
    drawIndicator(ctx, 12 + boxW / 2, mid + 1, boxW, HUD_HEIGHT - 14, floorText, 20);

    const start = 12 + boxW + 16;
    const fieldW = Math.min(140, (width - start - 8) / fields.length);
    ctx.textAlign = 'left';
    fields.forEach(({ label, value }, i) => {
      const x = start + i * fieldW;
      ctx.font = `bold 10px ${c['font-ui']}`;
      ctx.fillStyle = c['brass-300'];
      ctx.fillText(label, x, mid - 8);
      ctx.font = `17px ${c['font-num']}`;
      ctx.fillStyle = c.cream;
      ctx.fillText(value, x, mid + 9);
    });
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
    const { width, height } = viewSize(ctx);
    const viewW = width;
    const viewH = height - HUD_HEIGHT;

    ctx.fillStyle = T()['walnut-900'];
    ctx.fillRect(0, 0, width, height);

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

    return isWon(state);
  }

  // Static win screen (no animation, see DESIGN.md): a brass-framed
  // walnut card over the dimmed, solved board (drawn first by main.js).
  function renderComplete(ctx, stats, floor) {
    const c = T();
    const { width, height } = viewSize(ctx);

    ctx.fillStyle = 'rgba(28, 18, 11, 0.72)';
    ctx.fillRect(0, 0, width, height);

    const w = Math.min(440, width - 32);
    const h = 236;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    ctx.fillStyle = c['walnut-700'];
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c['brass-500'];
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = c['brass-300'];
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 7.5, y + 7.5, w - 15, h - 15);

    const { floorText, fields } = hudParts(floor, stats.moves, stats.pushes, stats.timeMs);
    const cx = width / 2;

    drawIndicator(ctx, cx, y + 42, 64, 36, floorText, 24);

    ctx.fillStyle = c.cream;
    ctx.font = `bold 28px ${c['font-ui']}`;
    ctx.fillText('Floor complete', cx, y + 92);

    const colW = (w - 40) / fields.length;
    fields.forEach(({ label, value }, i) => {
      const colX = x + 20 + colW * (i + 0.5);
      ctx.fillStyle = c['brass-300'];
      ctx.font = `bold 12px ${c['font-ui']}`;
      ctx.fillText(label, colX, y + 128);
      ctx.fillStyle = c.cream;
      ctx.font = `24px ${c['font-num']}`;
      ctx.fillText(value, colX, y + 154);
    });

    ctx.fillStyle = c['brass-500'];
    ctx.fillRect(x + 40, y + 182, w - 80, 1);

    ctx.fillStyle = c['brass-300'];
    ctx.font = `15px ${c['font-ui']}`;
    ctx.fillText('Tap or click to choose another floor', cx, y + 208);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  return {
    renderLevel, renderComplete, computeViewTransform, HUD_HEIGHT,
    theme: T, refreshTheme, drawIndicator, setPixelRatio, viewSize, renderCrateSample,
  };
});
