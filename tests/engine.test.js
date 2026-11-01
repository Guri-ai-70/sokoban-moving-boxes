const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLevel, tryMove, isWon, key, findPath, findBoxRoute } = require('../js/engine.js');

test('findPath walks around a box without pushing it', () => {
  const state = parseLevel('#####\n#P  #\n# B #\n#   #\n#####');
  const steps = findPath(state, 3, 3);
  assert.equal(steps.length, 4);
  let s = state;
  for (const [dx, dy] of steps) {
    const r = tryMove(s, dx, dy);
    assert.ok(r.moved && !r.pushed);
    s = r.state;
  }
  assert.deepEqual(s.player, { x: 3, y: 3 });
});

test('findPath returns null for wall, box, own cell, off-grid, unreachable', () => {
  const state = parseLevel('#####\n#PB #\n#####');
  assert.equal(findPath(state, 0, 0), null);
  assert.equal(findPath(state, 2, 1), null);
  assert.equal(findPath(state, 1, 1), null);
  assert.equal(findPath(state, 9, 9), null);
  assert.equal(findPath(state, 3, 1), null);
});

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

// Replays a route through tryMove; returns the final state and push count.
function replay(state, route) {
  let s = state;
  let pushes = 0;
  for (const [dx, dy] of route) {
    const r = tryMove(s, dx, dy);
    assert.ok(r.moved, 'every route step must be a legal move');
    if (r.pushed) pushes++;
    s = r.state;
  }
  return { state: s, pushes };
}

test('findBoxRoute pushes straight when the worker is already behind the box', () => {
  const state = parseLevel('######\n#PB  #\n######');
  const route = findBoxRoute(state, 2, 1, 4, 1);
  assert.deepEqual(route, [[1, 0], [1, 0]]);
});

test('findBoxRoute walks around to the far side first', () => {
  const state = parseLevel('#######\n#  B  #\n#  P  #\n#     #\n#######');
  const route = findBoxRoute(state, 3, 1, 1, 1);
  const { state: end, pushes } = replay(state, route);
  assert.ok(end.boxes.has(key(1, 1)));
  assert.equal(pushes, 2);
});

test('findBoxRoute turns a corner with the fewest pushes', () => {
  const state = parseLevel('#######\n#     #\n#  B  #\n#     #\n#P    #\n#######');
  const route = findBoxRoute(state, 3, 2, 5, 1);
  const { state: end, pushes } = replay(state, route);
  assert.ok(end.boxes.has(key(5, 1)));
  assert.equal(pushes, 3); // 2 right + 1 up
});

test('findBoxRoute leaves other boxes where they are', () => {
  const state = parseLevel('#######\n#P B  #\n#  B  #\n#     #\n#######');
  const route = findBoxRoute(state, 3, 1, 5, 1);
  const { state: end } = replay(state, route);
  assert.ok(end.boxes.has(key(5, 1)));
  assert.ok(end.boxes.has(key(3, 2)));
});

test('findBoxRoute returns null when another box blocks the only way', () => {
  const state = parseLevel('#####\n#PBB#\n#####');
  assert.equal(findBoxRoute(state, 2, 1, 3, 1), null);
});

test('findBoxRoute returns null for walls, other boxes, own cell, off-grid and non-boxes', () => {
  const state = parseLevel('#####\n#P B#\n#  B#\n#####');
  assert.equal(findBoxRoute(state, 2, 1, 0, 1), null); // wall
  assert.equal(findBoxRoute(state, 2, 1, 3, 2), null); // other box
  assert.equal(findBoxRoute(state, 2, 1, 2, 1), null); // own cell
  assert.equal(findBoxRoute(state, 2, 1, 9, 9), null); // off grid
  assert.equal(findBoxRoute(state, 1, 2, 2, 2), null); // not a box
});

test('findBoxRoute returns null for a cell the box can never reach', () => {
  // Target lies in a separate room behind a wall.
  const state = parseLevel('#######\n#P B  #\n#######\n#     #\n#######');
  assert.equal(findBoxRoute(state, 2, 1, 3, 3), null);
});

test('findBoxRoute prefers fewer walking steps among equal-push routes', () => {
  const state = parseLevel('#######\n#     #\n#P B  #\n#     #\n#######');
  const route = findBoxRoute(state, 3, 2, 5, 2);
  assert.equal(route.length, 3); // 1 step to get behind the box, then 2 pushes
  assert.equal(replay(state, route).pushes, 2);
});
