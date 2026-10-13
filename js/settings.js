// Settings panel (gear button in the top bar): colour theme + crate style.
//
// A theme is a set of --bt-* colour tokens in css/style.css, selected by
// a data-theme attribute on <html>; the crate style is a data-crate
// attribute the canvas renderer reads. Choices are saved in the browser
// under their own keys -- js/storage.js (results + mute) is untouched.
// Static: the panel shows and hides instantly, with no animation.

(function (global, factory) {
  const api = factory(global.SokobanRender);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanSettings = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanRender) {
  const THEMES = [
    { key: 'brass', name: 'Brass & Terrazzo' },
    { key: 'chrome', name: 'Chrome & Marble' },
    { key: 'copper', name: 'Copper & Slate' },
    { key: 'jade', name: 'Jade & Ivory' },
  ];
  const CRATES = [
    { key: 'oak', name: 'Oak crate' },
    { key: 'parcel', name: 'Parcel' },
    { key: 'trunk', name: 'Steamer trunk' },
  ];
  const THEME_KEY = 'sokoban:theme';
  const CRATE_KEY = 'sokoban:crate';

  // localStorage can be unavailable (private mode, blocked site data);
  // settings then simply aren't remembered.
  function load(storageKey, options) {
    let value = null;
    try {
      value = localStorage.getItem(storageKey);
    } catch (e) {
      value = null;
    }
    return options.some((o) => o.key === value) ? value : options[0].key;
  }

  function save(storageKey, value) {
    try {
      localStorage.setItem(storageKey, value);
    } catch (e) {
      // not remembered -- still applied for this visit
    }
  }

  let theme = load(THEME_KEY, THEMES);
  let crate = load(CRATE_KEY, CRATES);

  function apply() {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.crate = crate;
    SokobanRender.refreshTheme();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', SokobanRender.theme()['walnut-700']);
  }

  apply();

  // ---- panel UI
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings');
  const gear = document.getElementById('btn-settings');
  const themeList = document.getElementById('theme-options');
  const crateList = document.getElementById('crate-options');
  let onChoice = () => {};

  function optionButton(label, pressed, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opt';
    btn.setAttribute('aria-pressed', String(pressed));
    btn.addEventListener('click', () => {
      onClick();
      onChoice();
      build();
      // keep keyboard focus on the option that was just chosen
      const again = panel.querySelector(`[data-key="${btn.dataset.key}"]`);
      if (again) again.focus();
    });
    const name = document.createElement('span');
    name.className = 'opt-name';
    name.textContent = label;
    btn.appendChild(name);
    return btn;
  }

  function build() {
    themeList.textContent = '';
    for (const t of THEMES) {
      const btn = optionButton(t.name, t.key === theme, () => {
        theme = t.key;
        save(THEME_KEY, theme);
        apply();
      });
      btn.dataset.key = `theme-${t.key}`;
      // The swatch carries its own data-theme, so its stripes show that
      // theme's real colours straight from the CSS tokens.
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.dataset.theme = t.key;
      sw.setAttribute('aria-hidden', 'true');
      for (const part of ['wall', 'floor', 'metal', 'glow']) {
        const stripe = document.createElement('span');
        stripe.className = `sw-${part}`;
        sw.appendChild(stripe);
      }
      btn.insertBefore(sw, btn.firstChild);
      themeList.appendChild(btn);
    }

    crateList.textContent = '';
    for (const cr of CRATES) {
      const btn = optionButton(cr.name, cr.key === crate, () => {
        crate = cr.key;
        save(CRATE_KEY, crate);
        apply();
      });
      btn.dataset.key = `crate-${cr.key}`;
      const preview = document.createElement('canvas');
      preview.className = 'crate-preview';
      preview.setAttribute('aria-hidden', 'true');
      btn.insertBefore(preview, btn.firstChild);
      crateList.appendChild(btn);
      SokobanRender.renderCrateSample(preview, 88, 44, cr.key);
    }
  }

  let opener = null;

  function isOpen() {
    return !overlay.hidden;
  }

  function open() {
    opener = document.activeElement;
    build();
    overlay.hidden = false;
    gear.setAttribute('aria-expanded', 'true');
    const current = panel.querySelector('.opt[aria-pressed="true"]');
    (current || panel).focus();
  }

  function close() {
    overlay.hidden = true;
    gear.setAttribute('aria-expanded', 'false');
    (opener && opener.focus ? opener : gear).focus();
  }

  gear.addEventListener('click', () => (isOpen() ? close() : open()));
  document.getElementById('settings-done').addEventListener('click', close);
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

  // main.js hooks in here (e.g. a click sound) without this file
  // depending on it.
  function onOptionChosen(fn) {
    onChoice = fn;
  }

  return { THEMES, CRATES, isOpen, onOptionChosen };
});
