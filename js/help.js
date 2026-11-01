// "How to play" panel (? button in the top bar). Opens by itself on the
// very first visit (remembered in localStorage), then only on request.
// Static: the panel shows and hides instantly, with no animation.

(function (global, factory) {
  const api = factory();
  if (typeof global !== 'undefined') global.SokobanHelp = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SEEN_KEY = 'sokoban:howto-seen';

  // localStorage can be unavailable (private mode, blocked site data); the
  // panel then simply opens on every visit.
  function hasSeen() {
    try {
      return localStorage.getItem(SEEN_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markSeen() {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch (e) {
      // not remembered
    }
  }

  const overlay = document.getElementById('help-overlay');
  const panel = document.getElementById('help');
  const button = document.getElementById('btn-help');
  const doneBtn = document.getElementById('help-done');
  const closeBtn = document.getElementById('help-close');
  let opener = null;

  function isOpen() {
    return !overlay.hidden;
  }

  function open() {
    opener = document.activeElement;
    overlay.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    doneBtn.focus();
    markSeen();
  }

  function close() {
    overlay.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    (opener && opener.focus && opener !== document.body ? opener : button).focus();
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));
  doneBtn.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Esc closes; Tab stays inside the panel while it is open.
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      // Stop here, or the game's "any key calls the elevator" lobby
      // handler on window would also see this key press.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'Tab') {
      const items = [...panel.querySelectorAll('button')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  if (!hasSeen()) open();

  return { isOpen, open, close };
});
