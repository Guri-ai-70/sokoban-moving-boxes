const { tryMove, isWon, key } = require('../js/engine.js');

// Purpose-built verifier for the "shared storage room" level family used
// by js/levels.js: all boxes sit scattered along one row, all targets sit
// clustered in a separate stretch of that same row (the storage room), and
// the row directly above (boxRow - 1) is an open bypass with no boxes.
// A generic exhaustive BFS solver can't finish these in reasonable time
// (pushes can be dozens of cells long), but this level family always has
// a known-correct strategy: push whichever box is closest to the room
// first, into the farthest still-empty target, working inward — this
// simulates exactly that against the real engine and reports whether it
// actually reaches the win state, rather than trusting construction alone.
function simulateStorageSolve(state) {
  const boxes = [...state.boxes].map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
  if (boxes.length === 0) return false;
  const boxRow = boxes[0].y;
  if (!boxes.every((b) => b.y === boxRow)) return false;

  const targets = [...state.targets].map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
  if (!targets.every((t) => t.y === boxRow)) return false;

  const boxXs = boxes.map((b) => b.x);
  const targetXs = targets.map((t) => t.x).sort((a, b) => a - b);
  const avgBoxX = boxXs.reduce((a, b) => a + b, 0) / boxXs.length;
  const avgTargetX = targetXs.reduce((a, b) => a + b, 0) / targetXs.length;
  const reverse = avgTargetX < avgBoxX;
  const roomStart = targetXs[0];
  const roomSize = targetXs.length;

  const bypassRow = boxRow - 1;
  let cur = state;
  let px = cur.player.x, py = cur.player.y;

  function moveTo(dx, dy) {
    const r = tryMove(cur, dx, dy);
    if (!r.moved) return false;
    cur = r.state;
    px += dx; py += dy;
    return true;
  }
  function walkTo(tx, ty) {
    let guard = 0;
    while (py !== ty) {
      if (!moveTo(0, ty > py ? 1 : -1)) return false;
      if (++guard > 10000) return false;
    }
    guard = 0;
    while (px !== tx) {
      if (!moveTo(tx > px ? 1 : -1, 0)) return false;
      if (++guard > 10000) return false;
    }
    return true;
  }

  const pushDir = reverse ? -1 : 1;
  const order = [...boxXs].sort((a, b) => (reverse ? a - b : b - a));
  let nextTargetX = reverse ? roomStart : roomStart + roomSize - 1;

  for (const bx of order) {
    const approachX = bx - pushDir;
    if (!walkTo(approachX, bypassRow)) return false;
    if (!walkTo(approachX, boxRow)) return false;
    const pushCount = reverse ? bx - nextTargetX : nextTargetX - bx;
    if (pushCount < 0) return false;
    for (let i = 0; i < pushCount; i++) {
      const r = tryMove(cur, pushDir, 0);
      if (!r.moved || !r.pushed) return false;
      cur = r.state;
      px += pushDir;
    }
    nextTargetX -= pushDir;
  }

  return isWon(cur);
}

module.exports = { simulateStorageSolve };
