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
      removeItem: (k) => map.delete(k),
    };
  }

  let backend = defaultBackend();

  function setStorageBackend(newBackend) {
    backend = newBackend;
  }

  // Audio defaults OFF until a player explicitly unmutes (stores 'false')
  // via the mute icon -- so a fresh player never hears sound unasked.
  function getMuted() {
    const stored = backend.getItem('sokoban:muted');
    return stored === null ? true : stored === 'true';
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

  // Wipes every floor's saved best time/moves/pushes (the RESET button on
  // the keypad screen) -- takes the floor count explicitly rather than
  // guessing a range, since this module doesn't otherwise depend on
  // js/levels.js.
  function clearAllResults(floorCount) {
    for (let floor = 1; floor <= floorCount; floor++) {
      backend.removeItem(`sokoban:best:${floor}`);
    }
  }

  return {
    setStorageBackend, getMuted, setMuted, getBestResult, recordResult, clearAllResults,
  };
});
