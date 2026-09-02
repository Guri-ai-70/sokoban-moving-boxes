let backend = defaultBackend();

function defaultBackend() {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage;
  }
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

export function setStorageBackend(newBackend) {
  backend = newBackend;
}

export function getMuted() {
  return backend.getItem('sokoban:muted') === 'true';
}

export function setMuted(muted) {
  backend.setItem('sokoban:muted', String(muted));
}

export function getBestResult(floor) {
  const raw = backend.getItem(`sokoban:best:${floor}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function recordResult(floor, result) {
  const existing = getBestResult(floor);
  if (existing && existing.timeMs <= result.timeMs) return false;
  backend.setItem(`sokoban:best:${floor}`, JSON.stringify(result));
  return true;
}
