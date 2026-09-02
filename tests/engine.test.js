const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLevel, tryMove, isWon, key } = require('../js/engine.js');

test('parseLevel reads walls, floor, player, box, target', () => {
  const state = parseLevel('#####\n#TBP#\n#####');
  assert.equal(state.width, 5);
  assert.equal(state.height, 3);
  assert.deepEqual(state.player, { x: 3, y: 1 });
  assert.ok(state.boxes.has(key(2, 1)));
  assert.ok(state.targets.has(key(1, 1)));
  assert.ok(state.walls.has(key(0, 0)));
});

test('tryMove moves player onto open floor', () => {
  const state = parseLevel('#####\n#_P_#\n#####');
  const result = tryMove(state, -1, 0);
  assert.equal(result.moved, true);
  assert.equal(result.pushed, false);
  assert.deepEqual(result.state.player, { x: 1, y: 1 });
});

test('tryMove is blocked by a wall', () => {
  const state = parseLevel('#####\n#P__#\n#####');
  const result = tryMove(state, -1, 0);
  assert.equal(result.moved, false);
  assert.equal(result.state, state);
});

test('tryMove pushes a box onto open floor', () => {
  const state = parseLevel('#####\n#PB_#\n#####');
  const result = tryMove(state, 1, 0);
  assert.equal(result.moved, true);
  assert.equal(result.pushed, true);
  assert.deepEqual(result.state.player, { x: 2, y: 1 });
  assert.ok(result.state.boxes.has(key(3, 1)));
  assert.ok(!result.state.boxes.has(key(2, 1)));
});

test('tryMove blocks a push into a wall', () => {
  const s2 = parseLevel('####\n#PB#\n####');
  const result = tryMove(s2, 1, 0);
  assert.equal(result.moved, false);
});

test('tryMove blocks a push into another box', () => {
  const state = parseLevel('#####\n#PBB#\n#####');
  const result = tryMove(state, 1, 0);
  assert.equal(result.moved, false);
});

test('isWon is false until all boxes are on targets, true once they are', () => {
  const state = parseLevel('#####\n#TBP#\n#####');
  assert.equal(isWon(state), false);
  const pushed = tryMove(state, -1, 0);
  assert.equal(isWon(pushed.state), true);
});
