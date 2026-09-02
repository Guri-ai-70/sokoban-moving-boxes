const test = require('node:test');
const assert = require('node:assert/strict');
const { formatHud } = require('../js/hud.js');

test('formats floor, moves, pushes with zero padding', () => {
  assert.equal(
    formatHud(1, 102, 39, 82000),
    '01|moves:0102 pushes:0039 time:0:01:22'
  );
});

test('formats zero elapsed time', () => {
  assert.equal(
    formatHud(1, 0, 0, 0),
    '01|moves:0000 pushes:0000 time:0:00:00'
  );
});

test('formats times over an hour', () => {
  assert.equal(
    formatHud(10, 5, 1, 3661000),
    '10|moves:0005 pushes:0001 time:1:01:01'
  );
});
