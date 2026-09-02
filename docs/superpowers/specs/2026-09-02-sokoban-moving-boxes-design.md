# Sokoban-Moving-Boxes — Design Spec

Date: 2026-09-02
Status: Approved

## Summary

A browser-based recreation of the classic 1987-style Sokoban game, framed around
an office-elevator conceit: the player waits at an elevator, selects a floor
(1-10) on a keypad, and each floor is a Sokoban puzzle level. Built as a static
HTML5 Canvas game with no build step and no external dependencies, so it can be
opened directly or hosted via GitHub Pages.

Source material: a PDF spec provided by the user (`Sokoban.pdf`), including
screenshots of the elevator/keypad scene and levels 1-3.

## Screens / State Machine

Four screens, driven by a simple state machine in `main.js`:

1. **Lobby** — static illustrated scene of the character facing the elevator
   doors (original art in the same palette family as the PDF reference, not a
   pixel copy of it). Any key/click opens the keypad.
2. **Elevator Keypad** — numbered buttons 1-10 plus CLEAR and ACCEPT, styled
   like the PDF screenshot. Clicking a floor number then ACCEPT triggers a
   door-opening animation and transitions into that level. All 10 levels are
   selectable at any time — the game recommends playing 1→10 in order but does
   not lock levels.
3. **Level Play** — the Sokoban board itself, rendered on canvas, with a HUD
   bar at the bottom showing `<floor>|moves:<n> pushes:<n> time:<h:mm:ss>`,
   matching the PDF screenshot's format.
4. **Level Complete** — stats card (moves, pushes, time for that attempt) plus
   a short synthesized fanfare. A keypress/click returns to the Elevator
   Keypad screen so the player can pick the next floor.

## Game Engine

- Grid-based board. Each level is a 2D array of tile types: `wall`, `floor`,
  `target`, `box`, `box-on-target`, `player`, `player-on-target`.
- Movement: arrow keys or WASD move the player one tile in a direction. If a
  box occupies the destination tile and the tile beyond it is free (floor or
  target), the box is pushed along; walls and other boxes block movement.
- Win condition: every target tile has a box on it.
- A move log (list of `{ playerFrom, playerTo, boxMoved? }` entries) records
  every move for the current attempt. This log drives both the moves/pushes
  counters and the undo system.

## Levels

- **Levels 1-3**: recreated from the PDF's screenshots — wall layout, box and
  target positions reproduced as closely as the images allow.
- **Levels 4-10**: original designs, increasing in size/complexity, following
  standard Sokoban puzzle-design principles (no unavoidable deadlocks; each
  level verified solvable before shipping).
- Levels are data-only (`levels.js`), decoupled from rendering and engine
  logic — each level is a grid + metadata (name/floor number).

## HUD & Timer

Bottom HUD bar shows: current floor number, moves count, pushes count, and
elapsed time formatted `h:mm:ss`, in the same layout as the PDF screenshot
(`01|moves:0102 pushes:0039 time:0:01:22`). The timer starts on the player's
first move (not on level load) and stops the moment the level is completed.

## Undo

Full undo history for the current level attempt. Backspace or `U` pops the
last entry off the move log and reverses it — restores the player's previous
position and, if a box was pushed, restores the box's previous position too.
Moves/pushes counters are decremented to match. The undo history resets
whenever the level restarts or a new level loads.

## Audio

Synthesized via the Web Audio API — no external audio files, nothing
copyrighted. Oscillators + gain envelopes generate:
- a short blip on move/push,
- a distinct thunk when a box lands on or leaves a target,
- a small original fanfare (3-4 note arpeggio) on level completion.

## Visual Style

Retro palette matching the PDF screenshots: cyan floor, red-brick walls with
mortar-line detail, diamond-hatched target tiles, a simple pixel-art player
sprite with per-direction walking frames. Rendered on a single `<canvas>` with
a fixed tile size, scaled to fit the window. The lobby/elevator scene is
original illustrated art in a matching palette, not a reproduction of the
PDF's images.

## Persistence

`localStorage` stores the best (lowest) moves, pushes, and time per level.
Best results are shown on the Elevator Keypad screen next to each floor number
once that level has been completed at least once. No server, no accounts.

## Project Structure

```
Sokoban-Moving-Boxes/
  index.html
  css/style.css
  js/
    main.js        (state machine)
    engine.js       (grid logic, movement, undo)
    levels.js       (level data 1-10)
    render.js       (canvas drawing)
    audio.js        (synthesized sound)
    keypad.js       (elevator/keypad screen)
  README.md
```

## Testing

Manual verification via browser preview:
- Load each screen (Lobby → Keypad → Level → Complete → back to Keypad).
- Play level 1 end-to-end: move, push a box onto a target, undo a move,
  complete the level.
- Confirm HUD numbers (moves/pushes/time) update correctly.
- Confirm audio fires on move, push, target-land, and level completion.
- Confirm keypad navigation works for all 10 floors.
- Confirm best-times persist in `localStorage` across a page reload.

## Out of Scope (for this iteration)

- Multiplayer / accounts / server-side anything.
- Level editor.
- Mobile touch controls (keyboard-only for v1).
