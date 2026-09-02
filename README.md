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

Run the unit test suite (pure game-logic modules only; rendering/audio/
full gameplay are verified manually in a browser per
`docs/superpowers/specs/2026-09-02-sokoban-moving-boxes-design.md`):

```bash
node --test tests/
```
