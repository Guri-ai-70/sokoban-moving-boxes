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
   matching the PDF screenshot's format. Soft looping background music plays
   throughout this screen.
4. **Level Complete** — stats card (moves, pushes, time for that attempt) plus
   a short synthesized encouragement sound. A keypress/click returns to the
   Elevator Keypad screen so the player can pick the next floor.

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

- All 10 levels are single connected mazes — spiral/winding shafts of
  dead-end box+target chambers, wrapped in decorative outer loops — matching
  the branching brick-corridor density of the PDF's screenshots and their
  box counts: level 1 has 6 boxes, levels 2-3 have 10, and levels 4-10 ramp
  from 8 up to 10 with progressively larger, more winding mazes. Two earlier
  revisions (independent parallel corridors, then a handful of small rooms)
  looked nothing like real Sokoban and were dropped.
- Every level is verified solvable by the BFS checker in `tests/solver.js`
  before shipping; box-to-target pairing is flexible (any box may end on any
  target — the win condition only requires every target to be covered). Each
  box sits directly adjacent to its target (push distance 1) inside its own
  dead-end chamber — this is what keeps 10-box levels checkable by
  exhaustive search in well under a second; the challenge comes from
  navigating the maze to reach each chamber, not from long pushes.
- Levels are data-only (`levels.js`), decoupled from rendering and engine
  logic — each level is a grid + metadata (name/floor number). Because
  levels can now be larger than the canvas, `render.js` scrolls a camera
  centered on the player (clamped to the level bounds) instead of drawing
  the whole grid at a fixed position; the HUD is drawn in fixed screen
  space on top of the scrolled view.

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
- **Background music**: a soft, looping ambient chiptune-style track that
  plays throughout Level Play, starting when the level loads and stopping
  (or fading out) on completion or when leaving the level. Kept low-volume
  so it never competes with the sound effects.
- **Movement ping**: a short, gentle ping on every player move, whether or
  not a box is pushed.
- **Box-on-target thunk**: a distinct low thunk, layered on top of the
  movement ping, when a box lands on or leaves a target.
- **Encouragement sound**: a short, upbeat multi-note phrase on level
  completion — explicitly celebratory, distinct from the background music
  and the movement/push sounds.
- **Mute toggle**: a small speaker icon during Level Play lets the player
  mute/unmute music and sound effects; the preference persists in
  `localStorage`.

## Visual Style

Retro palette matching the PDF screenshots: cyan floor, red-brick walls, a
diamond outline for targets, and the player drawn as a small figure
(head + shirt + legs) rather than an abstract shape, so it reads as "a
person moving boxes" like the PDF's character art. Boxes render as a
3-face pseudo-3D cube (front/top/side). Walls render as extruded blocks
viewed at a slight angle: any wall tile whose top edge is actually exposed
(nothing stacked above it) draws a lighter, foreshortened top face before
its brick front face, which is what makes them read as 3D depth rather
than a flat top-down tile — matching the angled brick look of the PDF
screenshots. Rendered on a single `<canvas>` with a fixed tile size; the
camera scrolls to follow the player on levels bigger than the canvas (see
Levels). The lobby/elevator scene is original illustrated art in a
matching palette, not a reproduction of the PDF's images.

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
- Confirm background music loops softly during Level Play and stops on
  completion/exit.
- Confirm the movement ping fires on every move, the target thunk fires on
  box placement/removal, and the encouragement sound fires on completion.
- Confirm the mute toggle silences/restores audio and persists across reload.
- Confirm keypad navigation works for all 10 floors.
- Confirm best-times persist in `localStorage` across a page reload.

## Out of Scope (for this iteration)

- Multiplayer / accounts / server-side anything.
- Level editor.
- Mobile touch controls (keyboard-only for v1).
