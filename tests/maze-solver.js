const { tryMove, isWon, key } = require('../js/engine.js');

// Generic 2D solve verifier: BFS-pathfinds the player between push
// segments (so mazes can have real turns/loops, not just a straight
// corridor), and applies an explicit push plan, tracking each box's own
// position as it moves. Used to verify hand-designed 2D levels (ring
// mazes with turns) against the real engine — the exhaustive BFS solver
// in solver.js can't finish these in reasonable time once pushes span
// dozens of cells through a loop.

function bfsWalk(state, fromX, fromY, toX, toY) {
  if (fromX === toX && fromY === toY) return state;
  const seen = new Set([key(fromX, fromY)]);
  const queue = [[fromX, fromY, []]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const [x, y, path] = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      if (state.walls.has(k) || state.boxes.has(k)) continue;
      const newPath = [...path, [dx, dy]];
      if (nx === toX && ny === toY) {
        let s = state;
        for (const [ddx, ddy] of newPath) {
          const r = tryMove(s, ddx, ddy);
          if (!r.moved) throw new Error(`walk step failed at ${x},${y} dir ${ddx},${ddy}`);
          s = r.state;
        }
        return s;
      }
      seen.add(k);
      queue.push([nx, ny, newPath]);
    }
  }
  throw new Error(`no path from ${fromX},${fromY} to ${toX},${toY}`);
}

// plan: [{ start: [x,y], segments: [[dx,dy,count], ...] }, ...] — one
// entry per box (start = that box's position at the moment it's
// processed, so order matters). Each segment pushes the box `count`
// times in direction (dx,dy); the player is BFS-walked to the correct
// "behind" cell before each segment, so segments can turn corners.
function simulate2DSolve(text, plan) {
  const { parseLevel } = require('../js/engine.js');
  let state = parseLevel(text);
  let px = state.player.x, py = state.player.y;

  for (const { start, segments } of plan) {
    let [bx, by] = start;
    if (!state.boxes.has(key(bx, by))) {
      throw new Error(`no box at claimed start ${bx},${by}`);
    }
    for (const [dx, dy, count] of segments) {
      for (let i = 0; i < count; i++) {
        const approachX = bx - dx, approachY = by - dy;
        state = bfsWalk(state, px, py, approachX, approachY);
        px = approachX; py = approachY;
        const r = tryMove(state, dx, dy);
        if (!r.moved || !r.pushed) {
          throw new Error(`push failed for box at ${bx},${by} dir ${dx},${dy}`);
        }
        state = r.state;
        px += dx; py += dy;
        bx += dx; by += dy;
      }
    }
  }
  return { won: isWon(state), state };
}

module.exports = { bfsWalk, simulate2DSolve };
