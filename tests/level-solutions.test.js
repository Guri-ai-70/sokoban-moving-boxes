const test = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS } = require('../js/levels.js');
const { simulate2DSolve } = require('./maze-solver.js');

// Verified solve plans for each level: push whichever box's pocket is
// nearest the shared room first, always into the farthest still-open
// target in its row, so no box ever blocks the room entrance or another
// box's path. Each plan was derived and confirmed against the real
// engine (see the design spec) — this test re-confirms it against the
// CURRENT level data, so it also catches accidental edits to the maze
// breaking the known solution.
const PLANS = {
  1: [
    { start: [14, 5], segments: [[0, -1, 3], [1, 0, 1], [0, 1, 1], [1, 0, 3]] },
    { start: [12, 4], segments: [[0, -1, 2], [1, 0, 3], [0, 1, 1], [1, 0, 2]] },
    { start: [10, 3], segments: [[0, -1, 1], [1, 0, 5], [0, 1, 2], [1, 0, 3]] },
    { start: [8, 5], segments: [[0, -1, 3], [1, 0, 7], [0, 1, 2], [1, 0, 2]] },
    { start: [6, 4], segments: [[0, -1, 2], [1, 0, 9], [0, 1, 3], [1, 0, 3]] },
    { start: [4, 3], segments: [[0, -1, 1], [1, 0, 11], [0, 1, 3], [1, 0, 2]] },
  ],
  2: [
    { start: [4, 6], segments: [[0, -1, 4], [-1, 0, 1], [0, 1, 1], [-1, 0, 2]] },
    { start: [6, 4], segments: [[0, -1, 2], [-1, 0, 3], [0, 1, 2], [-1, 0, 2]] },
    { start: [8, 5], segments: [[0, -1, 3], [-1, 0, 5], [0, 1, 3], [-1, 0, 2]] },
    { start: [10, 3], segments: [[0, -1, 1], [-1, 0, 7], [0, 1, 4], [-1, 0, 2]] },
    { start: [12, 6], segments: [[0, -1, 4], [-1, 0, 9], [0, 1, 5], [-1, 0, 2]] },
    { start: [14, 4], segments: [[0, -1, 2], [-1, 0, 11], [0, 1, 6], [-1, 0, 2]] },
    { start: [16, 5], segments: [[0, -1, 3], [-1, 0, 13], [0, 1, 7], [-1, 0, 2]] },
    { start: [18, 3], segments: [[0, -1, 1], [-1, 0, 15], [0, 1, 8], [-1, 0, 2]] },
  ],
  3: [
    { start: [6, 5], segments: [[0, -1, 3], [-1, 0, 1], [0, 1, 1], [-1, 0, 4]] },
    { start: [8, 4], segments: [[0, -1, 2], [-1, 0, 3], [0, 1, 1], [-1, 0, 3]] },
    { start: [10, 3], segments: [[0, -1, 1], [-1, 0, 5], [0, 1, 1], [-1, 0, 2]] },
    { start: [12, 5], segments: [[0, -1, 3], [-1, 0, 7], [0, 1, 2], [-1, 0, 4]] },
    { start: [14, 4], segments: [[0, -1, 2], [-1, 0, 9], [0, 1, 2], [-1, 0, 3]] },
    { start: [16, 3], segments: [[0, -1, 1], [-1, 0, 11], [0, 1, 2], [-1, 0, 2]] },
    { start: [18, 5], segments: [[0, -1, 3], [-1, 0, 13], [0, 1, 3], [-1, 0, 4]] },
    { start: [20, 4], segments: [[0, -1, 2], [-1, 0, 15], [0, 1, 3], [-1, 0, 3]] },
    { start: [22, 3], segments: [[0, -1, 1], [-1, 0, 17], [0, 1, 3], [-1, 0, 2]] },
  ],
  4: [
    { start: [22, 5], segments: [[0, -1, 3], [1, 0, 1], [0, 1, 1], [1, 0, 3]] },
    { start: [20, 3], segments: [[0, -1, 1], [1, 0, 3], [0, 1, 1], [1, 0, 2]] },
    { start: [18, 6], segments: [[0, -1, 4], [1, 0, 5], [0, 1, 2], [1, 0, 3]] },
    { start: [16, 4], segments: [[0, -1, 2], [1, 0, 7], [0, 1, 2], [1, 0, 2]] },
    { start: [14, 5], segments: [[0, -1, 3], [1, 0, 9], [0, 1, 3], [1, 0, 3]] },
    { start: [12, 3], segments: [[0, -1, 1], [1, 0, 11], [0, 1, 3], [1, 0, 2]] },
    { start: [10, 6], segments: [[0, -1, 4], [1, 0, 13], [0, 1, 4], [1, 0, 3]] },
    { start: [8, 4], segments: [[0, -1, 2], [1, 0, 15], [0, 1, 4], [1, 0, 2]] },
    { start: [6, 5], segments: [[0, -1, 3], [1, 0, 17], [0, 1, 5], [1, 0, 3]] },
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
