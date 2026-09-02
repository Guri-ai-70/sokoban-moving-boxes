import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel } from '../js/engine.js';
import { solve } from './solver.js';

test('solve finds a solution for a trivially solvable level', () => {
  const state = parseLevel('#####\n#TBP#\n#####');
  assert.equal(solve(state), true);
});

test('solve returns false for a deadlocked level', () => {
  const state = parseLevel('####\n#BP#\n#T##\n####');
  assert.equal(solve(state), false);
});
