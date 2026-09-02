const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLevel } = require('../js/engine.js');
const { simulateStorageSolve } = require('./storage-solver.js');
const { LEVELS } = require('../js/levels.js');

test('there are exactly 10 levels, numbered 1-10 in order', () => {
  assert.equal(LEVELS.length, 10);
  LEVELS.forEach((lvl, i) => assert.equal(lvl.floor, i + 1));
});

test('every level parses with equal box and target counts', () => {
  for (const lvl of LEVELS) {
    const state = parseLevel(lvl.text);
    assert.equal(
      state.boxes.size,
      state.targets.size,
      `level ${lvl.floor}: box/target count mismatch`
    );
    assert.ok(state.boxes.size > 0, `level ${lvl.floor}: has no boxes`);
  }
});

test('every level is solvable (shared-storage-room strategy)', () => {
  for (const lvl of LEVELS) {
    const state = parseLevel(lvl.text);
    assert.equal(
      simulateStorageSolve(state),
      true,
      `level ${lvl.floor} is not solvable via the storage-room strategy`
    );
  }
});
