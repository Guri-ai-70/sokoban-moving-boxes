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

  // Every cell the worker can walk to from (sx, sy) while the cells in
  // `blocked` and the walls are obstacles. Map of key -> { prev, dir, dist }
  // where prev is the previous cell key and dir the [dx, dy] step into it.
  function reachable(state, blocked, sx, sy) {
    const start = key(sx, sy);
    const info = new Map([[start, { prev: null, dir: null, dist: 0 }]]);
    const queue = [[sx, sy]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      const here = info.get(key(x, y));
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
        if (info.has(nk) || state.walls.has(nk) || blocked.has(nk)) continue;
        info.set(nk, { prev: key(x, y), dir: [dx, dy], dist: here.dist + 1 });
        queue.push([nx, ny]);
      }
    }
    return info;
  }

  function stepsTo(info, cellKey) {
    const steps = [];
    for (let r = info.get(cellKey); r && r.prev !== null; r = info.get(r.prev)) steps.push(r.dir);
    return steps.reverse();
  }

  // Route that moves the box at (bx, by) to (tx, ty) with the fewest pushes
  // (ties: the fewest walking steps). Other boxes stay put. Returns the whole
  // list of [dx, dy] steps -- the worker's walks to the correct side plus the
  // pushes -- ready to feed to tryMove, or null when there is no route, the
  // cell is not a box, or the target is the box's own cell.
  function findBoxRoute(state, bx, by, tx, ty) {
    if (!state.boxes.has(key(bx, by))) return null;
    if (tx < 0 || ty < 0 || tx >= state.width || ty >= state.height) return null;
    const targetKey = key(tx, ty);
    if (targetKey === key(bx, by) || state.walls.has(targetKey) || state.boxes.has(targetKey)) {
      return null;
    }

    const PUSH_COST = 10000; // far above any walk length, so pushes dominate
    const others = new Set(state.boxes);
    others.delete(key(bx, by));

    // Node = box cell + push direction (the worker stands behind the box).
    const nodeKey = (x, y, d) => `${x},${y},${d}`;
    const best = new Map();
    const open = [];

    // Expand all pushes available once the worker is at (px, py) and the box
    // is at (x, y); `from` is the node that led here (null at the start).
    function expand(x, y, px, py, baseCost, from) {
      const blocked = new Set(others);
      blocked.add(key(x, y));
      const reach = reachable(state, blocked, px, py);
      DIRS.forEach(([dx, dy], d) => {
        const behind = key(x - dx, y - dy);
        const ahead = key(x + dx, y + dy);
        if (!reach.has(behind)) return;
        if (state.walls.has(ahead) || others.has(ahead)) return;
        if (x + dx < 0 || y + dy < 0 || x + dx >= state.width || y + dy >= state.height) return;
        const walk = stepsTo(reach, behind);
        const cost = baseCost + walk.length;
        const nk = nodeKey(x, y, d);
        if (best.has(nk) && best.get(nk).cost <= cost) return;
        const node = { x, y, d, cost, from, walk };
        best.set(nk, node);
        open.push(node);
      });
    }

    expand(bx, by, state.player.x, state.player.y, 0, null);
    const done = new Set();
    while (open.length > 0) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].cost < open[bi].cost) bi = i;
      const node = open.splice(bi, 1)[0];
      const nk = nodeKey(node.x, node.y, node.d);
      if (done.has(nk) || best.get(nk) !== node) continue;
      done.add(nk);
      const [dx, dy] = DIRS[node.d];
      const nx = node.x + dx;
      const ny = node.y + dy;
      const pushedCost = node.cost + PUSH_COST;
      if (nx === tx && ny === ty) {
        const route = [];
        const chain = [];
        for (let n = node; n; n = n.from) chain.push(n);
        for (const n of chain.reverse()) route.push(...n.walk, DIRS[n.d]);
        return route;
      }
      // After the push the worker stands where the box was.
      expand(nx, ny, node.x, node.y, pushedCost, node);
    }
    return null;
  }

  return { key, parseLevel, cloneState, tryMove, isWon, findPath, findBoxRoute };
});
