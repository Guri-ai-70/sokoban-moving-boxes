const test = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS } = require('../js/levels.js');
const { simulate2DSolve } = require('./maze-solver.js');

// Verified solve plans for each level: push whichever box is nearest the
// shared room first, always into the farthest still-open target in its
// row, so no box ever blocks the room entrance or another box's path.
// Each plan was derived and confirmed against the real engine (see the
// design spec) — this test re-confirms it against the CURRENT level
// data, so it also catches accidental edits to the maze breaking the
// known solution.
const PLANS = {
  1: [
    { start: [12, 4], segments: [[0, -1, 2], [1, 0, 3], [0, 1, 1], [1, 0, 3]] },
    { start: [11, 3], segments: [[0, -1, 1], [1, 0, 4], [0, 1, 1], [1, 0, 2]] },
    { start: [9, 3], segments: [[0, -1, 1], [1, 0, 6], [0, 1, 2], [1, 0, 3]] },
    { start: [8, 5], segments: [[0, -1, 3], [1, 0, 7], [0, 1, 2], [1, 0, 2]] },
    { start: [5, 5], segments: [[0, -1, 3], [1, 0, 10], [0, 1, 3], [1, 0, 3]] },
    { start: [4, 3], segments: [[0, -1, 1], [1, 0, 11], [0, 1, 3], [1, 0, 2]] },
  ],
  2: [
    { start: [5, 4], segments: [[0, -1, 2], [-1, 0, 2], [0, 1, 1], [-1, 0, 2]] },
    { start: [6, 5], segments: [[0, -1, 3], [-1, 0, 3], [0, 1, 2], [-1, 0, 2]] },
    { start: [8, 6], segments: [[0, -1, 4], [-1, 0, 5], [0, 1, 3], [-1, 0, 2]] },
    { start: [10, 3], segments: [[0, -1, 1], [-1, 0, 7], [0, 1, 4], [-1, 0, 2]] },
    { start: [12, 5], segments: [[0, -1, 3], [-1, 0, 9], [0, 1, 5], [-1, 0, 2]] },
    { start: [14, 4], segments: [[0, -1, 2], [-1, 0, 11], [0, 1, 6], [-1, 0, 2]] },
    { start: [16, 6], segments: [[0, -1, 4], [-1, 0, 13], [0, 1, 7], [-1, 0, 2]] },
    { start: [18, 3], segments: [[0, -1, 1], [-1, 0, 15], [0, 1, 8], [-1, 0, 2]] },
  ],
  3: [
    { start: [8, 5], segments: [[0, -1, 3], [-1, 0, 3], [0, 1, 1], [-1, 0, 4]] },
    { start: [10, 4], segments: [[0, -1, 2], [-1, 0, 5], [0, 1, 1], [-1, 0, 3]] },
    { start: [12, 3], segments: [[0, -1, 1], [-1, 0, 7], [0, 1, 1], [-1, 0, 2]] },
    { start: [13, 6], segments: [[0, -1, 4], [-1, 0, 8], [0, 1, 2], [-1, 0, 4]] },
    { start: [15, 3], segments: [[0, -1, 1], [-1, 0, 10], [0, 1, 2], [-1, 0, 3]] },
    { start: [17, 4], segments: [[0, -1, 2], [-1, 0, 12], [0, 1, 2], [-1, 0, 2]] },
    { start: [18, 6], segments: [[0, -1, 4], [-1, 0, 13], [0, 1, 3], [-1, 0, 4]] },
    { start: [20, 5], segments: [[0, -1, 3], [-1, 0, 15], [0, 1, 3], [-1, 0, 3]] },
    { start: [22, 3], segments: [[0, -1, 1], [-1, 0, 17], [0, 1, 3], [-1, 0, 2]] },
  ],
  4: [
    { start: [21, 4], segments: [[0, -1, 2], [1, 0, 2], [0, 1, 1], [1, 0, 3]] },
    { start: [19, 5], segments: [[0, -1, 3], [1, 0, 4], [0, 1, 1], [1, 0, 2]] },
    { start: [17, 7], segments: [[0, -1, 5], [1, 0, 6], [0, 1, 2], [1, 0, 3]] },
    { start: [15, 3], segments: [[0, -1, 1], [1, 0, 8], [0, 1, 2], [1, 0, 2]] },
    { start: [14, 6], segments: [[0, -1, 4], [1, 0, 9], [0, 1, 3], [1, 0, 3]] },
    { start: [12, 5], segments: [[0, -1, 3], [1, 0, 11], [0, 1, 3], [1, 0, 2]] },
    { start: [9, 4], segments: [[0, -1, 2], [1, 0, 14], [0, 1, 4], [1, 0, 3]] },
    { start: [8, 7], segments: [[0, -1, 5], [1, 0, 15], [0, 1, 4], [1, 0, 2]] },
    { start: [6, 6], segments: [[0, -1, 4], [1, 0, 17], [0, 1, 5], [1, 0, 3]] },
    { start: [4, 3], segments: [[0, -1, 1], [1, 0, 19], [0, 1, 5], [1, 0, 2]] },
  ],
};

test('every level has a verified solve plan that actually wins', () => {
  for (const lvl of LEVELS) {
    const plan = PLANS[lvl.floor];
    assert.ok(plan, `level ${lvl.floor}: no verified plan on file`);
    const { won } = simulate2DSolve(lvl.text, plan);
    assert.equal(won, true, `level ${lvl.floor}: verified plan no longer wins`);
  }
});
