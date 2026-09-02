const { tryMove, isWon, key } = require('../js/engine.js');

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function stateKey(state) {
  const boxKeys = [...state.boxes].sort().join('|');
  return `${key(state.player.x, state.player.y)}:${boxKeys}`;
}

function solve(initialState, maxStates = 200000) {
  if (isWon(initialState)) return true;

  const seen = new Set([stateKey(initialState)]);
  const queue = [initialState];
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    visited++;
    if (visited > maxStates) return false;

    for (const [dx, dy] of DIRS) {
      const { state: next, moved } = tryMove(current, dx, dy);
      if (!moved) continue;
      if (isWon(next)) return true;
      const k = stateKey(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }
  return false;
}

module.exports = { solve };
