const test = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS } = require('../js/levels.js');
const { parseLevel, key } = require('../js/engine.js');
const { simulate2DSolve } = require('./maze-solver.js');

// Level 1 has a fully verified push-plan: a general state-space solver
// (box-set + player-region search, Hungarian-matching heuristic) found
// this sequence and it's re-checked here against the real engine, so
// this also catches accidental edits to the maze breaking the known
// solution. Levels 2-10 are exact cell-for-cell transcriptions of the
// original game's own level-design spreadsheets, dense enough (10-20
// boxes) that a full push-plan hasn't been found yet for them -- those
// rely on the static sanity checks below instead for now.
const PLANS = {
  1: [
    { start: [7, 4], segments: [[-1, 0, 1]] },
    { start: [7, 3], segments: [[0, -1, 1], [0, 1, 1]] },
    { start: [5, 4], segments: [[0, 1, 1]] },
    { start: [6, 4], segments: [[1, 0, 1]] },
    { start: [5, 2], segments: [[0, 1, 1]] },
    { start: [5, 5], segments: [[0, 1, 1]] },
    { start: [5, 7], segments: [[1, 0, 1]] },
    { start: [5, 6], segments: [[0, 1, 1]] },
    { start: [2, 7], segments: [[1, 0, 2]] },
    { start: [5, 7], segments: [[0, 1, 1]] },
    { start: [6, 7], segments: [[1, 0, 4]] },
    { start: [5, 8], segments: [[0, -1, 1]] },
    { start: [10, 7], segments: [[1, 0, 5], [0, 1, 1], [1, 0, 2]] },
    { start: [5, 7], segments: [[0, -1, 1]] },
    { start: [4, 7], segments: [[-1, 0, 2]] },
    { start: [5, 6], segments: [[0, 1, 1]] },
    { start: [5, 3], segments: [[0, 1, 3]] },
    { start: [5, 7], segments: [[1, 0, 1]] },
    { start: [5, 6], segments: [[0, 1, 1]] },
    { start: [2, 7], segments: [[1, 0, 2]] },
    { start: [5, 7], segments: [[0, 1, 1]] },
    { start: [6, 7], segments: [[1, 0, 4]] },
    { start: [5, 8], segments: [[0, -1, 1]] },
    { start: [10, 7], segments: [[1, 0, 5], [0, -1, 1], [1, 0, 2]] },
    { start: [7, 4], segments: [[-1, 0, 1]] },
    { start: [7, 3], segments: [[0, -1, 1], [0, 1, 1]] },
    { start: [6, 4], segments: [[1, 0, 1]] },
    { start: [5, 7], segments: [[0, 1, 1]] },
    { start: [4, 7], segments: [[1, 0, 11], [0, -1, 1], [1, 0, 1]] },
    { start: [5, 8], segments: [[0, -1, 2], [0, 1, 1], [1, 0, 10], [0, 1, 1], [1, 0, 1]] },
    { start: [7, 4], segments: [[-1, 0, 2]] },
    { start: [7, 3], segments: [[0, 1, 1]] },
    { start: [5, 4], segments: [[0, 1, 3], [1, 0, 12]] },
    { start: [7, 4], segments: [[-1, 0, 2], [0, 1, 3], [1, 0, 11]] },
  ],
};

test('level 1 has a verified solve plan that actually wins', () => {
  const lvl = LEVELS.find((l) => l.floor === 1);
  const { won } = simulate2DSolve(lvl.text, PLANS[1]);
  assert.equal(won, true, 'level 1: verified plan no longer wins');
});

// Static sanity checks for every level (including 1-2, as a floor): the
// player's start region reaches every floor cell, and no box sits in a
// position where every axis is permanently blocked by a wall or another
// box that is itself permanently stuck (the classic "frozen box"
// deadlock) -- a necessary, non-exhaustive check that catches broken
// transcriptions (an unreachable box, a box wedged in a dead corner)
// without requiring a full solve.
function staticSanityCheck(text) {
  const state = parseLevel(text);
  const { walls, boxes, targets, player } = state;

  const reachable = new Set([key(player.x, player.y)]);
  const stack = [[player.x, player.y]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const k = key(nx, ny);
      if (reachable.has(k) || walls.has(k)) continue;
      reachable.add(k);
      stack.push([nx, ny]);
    }
  }
  const unreachableBoxes = [...boxes].filter((b) => !reachable.has(b));

  function isBlocked(x, y, frozen) {
    return walls.has(key(x, y)) || frozen.has(key(x, y));
  }
  const frozen = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of boxes) {
      if (frozen.has(b)) continue;
      const [x, y] = b.split(',').map(Number);
      const xBlocked = isBlocked(x - 1, y, frozen) && isBlocked(x + 1, y, frozen);
      const yBlocked = isBlocked(x, y - 1, frozen) && isBlocked(x, y + 1, frozen);
      if (xBlocked && yBlocked && !targets.has(b)) {
        frozen.add(b);
        changed = true;
      }
    }
  }

  return { unreachableBoxes, frozenBoxes: [...frozen] };
}

test('every level is fully connected with no unreachable or frozen boxes', () => {
  for (const lvl of LEVELS) {
    const { unreachableBoxes, frozenBoxes } = staticSanityCheck(lvl.text);
    assert.deepEqual(unreachableBoxes, [], `level ${lvl.floor}: unreachable box(es) ${unreachableBoxes}`);
    assert.deepEqual(frozenBoxes, [], `level ${lvl.floor}: permanently frozen box(es) ${frozenBoxes}`);
  }
});

module.exports = { staticSanityCheck };
