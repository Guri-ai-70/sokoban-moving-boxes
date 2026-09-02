(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanStorage = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
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

  let backend = defaultBackend();

  function setStorageBackend(newBackend) {
    backend = newBackend;
  }

  function getMuted() {
    return backend.getItem('sokoban:muted') === 'true';
  }

  function setMuted(muted) {
    backend.setItem('sokoban:muted', String(muted));
  }

  function getBestResult(floor) {
    const raw = backend.getItem(`sokoban:best:${floor}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function recordResult(floor, result) {
    const existing = getBestResult(floor);
    if (existing && existing.timeMs <= result.timeMs) return false;
    backend.setItem(`sokoban:best:${floor}`, JSON.stringify(result));
    return true;
  }

  return { setStorageBackend, getMuted, setMuted, getBestResult, recordResult };
});
