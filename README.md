# Sokoban - Moving Boxes

A browser-based recreation of the classic 1987-style Sokoban puzzle game,
framed around an office elevator: pick a floor (1-10) and solve that
floor's box-pushing puzzle.

## Play

Open `index.html` directly in a browser, or serve the folder with any
static file server (e.g. `npx serve .`) and visit it in a browser. It fills
the window on desktop and works on phones held in portrait or landscape.

Keyboard:
- Arrow keys or WASD: move
- `R`: restart the current level
- `U` or Backspace: undo the last move
- Clicking a tile right next to the bellhop moves there; right-click undoes

Touch / on-screen buttons (shown while playing a floor):
- Arrow buttons: move
- Undo and Restart buttons

Top bar:
- Gear: settings - colour theme (Brass & Terrazzo, Chrome & Marble,
  Copper & Slate, Jade & Ivory) and crate style (Oak crate, Parcel,
  Steamer trunk). Saved in the browser.
- Muted / Sound on: toggles all sound. Sound starts muted.

## Development

The `js/*.js` files are plain classic scripts (not ES modules), each
attaching its API to a `window.Sokoban*` global (e.g. `SokobanEngine`,
`SokobanLevels`) and to `module.exports` for Node. This is deliberate:
`type="module"` scripts are blocked by browsers when opening `index.html`
via `file://`, while classic `<script src>` tags work everywhere. Load
order in `index.html` matters — each file's dependencies must be listed
before it.

**Cache-busting:** every CSS/JS tag in `index.html` ends in `?v=<version>`.
Bump that version (all tags together) whenever any CSS or JS file changes,
so browsers never combine a cached old file with a new one after a deploy
(e.g. an old `audio.js` with a new `main.js`).

Visual design (themes, tokens, crate contrast rules) is documented in
`DESIGN.md`; product constraints in `PRODUCT.md`.

Run the unit test suite (pure game-logic modules only; rendering/audio/
full gameplay are verified manually in a browser per
`docs/superpowers/specs/2026-09-02-sokoban-moving-boxes-design.md`):

```bash
node --test "tests/*.test.js"
```
