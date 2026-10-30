(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function key(x, y) {
    return `${x},${y}`;
  }

  function parseLevel(text) {
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

  function cloneState(state) {
    return {
      width: state.width,
      height: state.height,
      walls: state.walls,
      targets: state.targets,
      boxes: new Set(state.boxes),
      player: { x: state.player.x, y: state.player.y },
    };
  }

  function tryMove(state, dx, dy) {
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

  function isWon(state) {
    for (const t of state.targets) {
      if (!state.boxes.has(t)) return false;
    }
    return true;
  }

  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  // Shortest walk (BFS) from the player to (gx, gy) over open floor. Walls
  // and boxes are obstacles, so the walk never pushes. Returns a list of
  // [dx, dy] steps, or null when the cell is unreachable, off the grid, or
  // is the player's own cell.
  function findPath(state, gx, gy) {
    if (gx < 0 || gy < 0 || gx >= state.width || gy >= state.height) return null;
    const goal = key(gx, gy);
    if (state.walls.has(goal) || state.boxes.has(goal)) return null;
    const start = key(state.player.x, state.player.y);
    if (goal === start) return null;

    const prev = new Map([[start, null]]);
    const queue = [[state.player.x, state.player.y]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
        if (prev.has(nk) || state.walls.has(nk) || state.boxes.has(nk)) continue;
        prev.set(nk, [x, y, dx, dy]);
        if (nk === goal) {
          const steps = [];
          for (let p = prev.get(nk); p; p = prev.get(key(p[0], p[1]))) steps.push([p[2], p[3]]);
          return steps.reverse();
        }
        queue.push([nx, ny]);
      }
    }
    return null;
  }

  return { key, parseLevel, cloneState, tryMove, isWon, findPath };
});
