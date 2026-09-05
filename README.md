# Sokoban - Moving Boxes

A browser-based recreation of the classic 1987-style Sokoban puzzle game,
framed around an office elevator: pick a floor (1-10) and solve that
floor's box-pushing puzzle.

## Play

Open `index.html` directly in a browser, or serve the folder with any
static file server (e.g. `npx serve .`) and visit it in a browser.

Controls:
- Arrow keys or WASD: move
- `R`: restart the current level
- `U` or Backspace: undo the last move
- Click the speaker icon during play to mute/unmute audio

## Development

The `js/*.js` files are plain classic scripts (not ES modules), each
attaching its API to a `window.Sokoban*` global (e.g. `SokobanEngine`,
`SokobanLevels`) and to `module.exports` for Node. This is deliberate:
`type="module"` scripts are blocked by browsers when opening `index.html`
via `file://`, while classic `<script src>` tags work everywhere. Load
order in `index.html` matters — each file's dependencies must be listed
before it.

Run the unit test suite (pure game-logic modules only; rendering/audio/
full gameplay are verified manually in a browser per
`docs/superpowers/specs/2026-09-02-sokoban-moving-boxes-design.md`):

```bash
node --test "tests/*.test.js"
```
