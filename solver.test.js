const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLevel } = require('../js/engine.js');
const { solve } = require('./solver.js');

test('solve finds a solution for a trivially solvable level', () => {
  const state = parseLevel('#####\n#TBP#\n#####');
  assert.equal(solve(state), true);
});

test('solve returns false for a deadlocked level', () => {
  const state = parseLevel('####\n#BP#\n#T##\n####');
  assert.equal(solve(state), false);
});
