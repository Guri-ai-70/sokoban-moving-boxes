const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMuted, setMuted, getBestResult, recordResult, clearAllResults, setStorageBackend,
} = require('../js/storage.js');

function freshBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('getMuted defaults to true (audio off until unmuted), setMuted persists', () => {
  setStorageBackend(freshBackend());
  assert.equal(getMuted(), true);
  setMuted(false);
  assert.equal(getMuted(), false);
  setMuted(true);
  assert.equal(getMuted(), true);
});

test('getBestResult returns null when nothing stored', () => {
  setStorageBackend(freshBackend());
  assert.equal(getBestResult(1), null);
});

test('recordResult stores the first result and reports an update', () => {
  setStorageBackend(freshBackend());
  const updated = recordResult(1, { moves: 10, pushes: 3, timeMs: 5000 });
  assert.equal(updated, true);
  assert.deepEqual(getBestResult(1), { moves: 10, pushes: 3, timeMs: 5000 });
});

test('recordResult only overwrites when the new time is faster', () => {
  setStorageBackend(freshBackend());
  recordResult(1, { moves: 10, pushes: 3, timeMs: 5000 });
  const worse = recordResult(1, { moves: 20, pushes: 5, timeMs: 9000 });
  assert.equal(worse, false);
  assert.deepEqual(getBestResult(1), { moves: 10, pushes: 3, timeMs: 5000 });

  const better = recordResult(1, { moves: 8, pushes: 2, timeMs: 3000 });
  assert.equal(better, true);
  assert.deepEqual(getBestResult(1), { moves: 8, pushes: 2, timeMs: 3000 });
});

test('getBestResult returns null on corrupt stored data', () => {
  const backend = freshBackend();
  backend.setItem('sokoban:best:2', 'not-json{');
  setStorageBackend(backend);
  assert.equal(getBestResult(2), null);
});

test('clearAllResults wipes every floor\'s best result (the RESET button)', () => {
  setStorageBackend(freshBackend());
  recordResult(1, { moves: 10, pushes: 3, timeMs: 5000 });
  recordResult(2, { moves: 20, pushes: 5, timeMs: 9000 });
  recordResult(3, { moves: 7, pushes: 1, timeMs: 2000 });
  clearAllResults(3);
  assert.equal(getBestResult(1), null);
  assert.equal(getBestResult(2), null);
  assert.equal(getBestResult(3), null);
});
