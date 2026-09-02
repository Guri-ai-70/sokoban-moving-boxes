import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel } from '../js/engine.js';
import { solve } from './solver.js';
import { LEVELS } from '../js/levels.js';

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

test('every level is solvable', () => {
  for (const lvl of LEVELS) {
    const state = parseLevel(lvl.text);
    assert.equal(solve(state), true, `level ${lvl.floor} is not solvable`);
  }
});
