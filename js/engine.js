export function key(x, y) {
  return `${x},${y}`;
}

export function parseLevel(text) {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const walls = new Set();
  const targets = new Set();
  const boxes = new Set();
  let player = null;

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '#';
      if (ch === '#') walls.add(key(x, y));
      if (ch === 'T' || ch === 'X' || ch === 'Q') targets.add(key(x, y));
      if (ch === 'B' || ch === 'X') boxes.add(key(x, y));
      if (ch === 'P' || ch === 'Q') player = { x, y };
    }
  });

  if (!player) throw new Error('Level has no player start position');
  return { width, height, walls, targets, boxes, player };
}

export function cloneState(state) {
  return {
    width: state.width,
    height: state.height,
    walls: state.walls,
    targets: state.targets,
    boxes: new Set(state.boxes),
    player: { x: state.player.x, y: state.player.y },
  };
}

export function tryMove(state, dx, dy) {
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  const nk = key(nx, ny);

  if (state.walls.has(nk)) return { state, moved: false, pushed: false };

  if (state.boxes.has(nk)) {
    const bx = nx + dx;
    const by = ny + dy;
    const bk = key(bx, by);
    if (state.walls.has(bk) || state.boxes.has(bk)) {
      return { state, moved: false, pushed: false };
    }
    const next = cloneState(state);
    next.boxes.delete(nk);
    next.boxes.add(bk);
    next.player = { x: nx, y: ny };
    return { state: next, moved: true, pushed: true };
  }

  const next = cloneState(state);
  next.player = { x: nx, y: ny };
  return { state: next, moved: true, pushed: false };
}

export function isWon(state) {
  for (const t of state.targets) {
    if (!state.boxes.has(t)) return false;
  }
  return true;
}
