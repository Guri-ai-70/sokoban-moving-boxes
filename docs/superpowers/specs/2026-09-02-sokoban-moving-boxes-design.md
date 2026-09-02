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

Five screens, driven by a simple state machine in `main.js`:

1. **Lobby** — illustrated scene of the character facing the closed elevator
   doors (original art in the same palette family as the PDF reference, not a
   pixel copy of it), with a lit call button beside the doors. Pressing any
   key or clicking the button calls the elevator.
2. **Calling** — a ~0.9s transition: the call button lights up, a ding plays,
   and the doors slide open revealing the elevator interior, then the screen
   advances automatically to the keypad.
3. **Elevator Keypad** — numbered buttons for the currently shipped levels
   (see Levels) plus CLEAR and ACCEPT, styled like the PDF screenshot.
   Clicking a floor number then ACCEPT transitions straight into that level
   (no further animation). All levels are selectable at any time — nothing
   is locked.
4. **Level Play** — the Sokoban board itself, rendered on canvas at a
   per-level tile size so the whole level fits on screen at once (see
   Levels), with a HUD bar at the bottom showing
   `<floor>|moves:<n> pushes:<n> time:<h:mm:ss>`, matching the PDF
   screenshot's format. A looping background melody plays throughout this
   screen.
5. **Level Complete** — stats card (moves, pushes, time for that attempt) plus
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

- **Scoped to levels 1-3 for now**, at the user's request, so effort goes
  into matching the reference screenshots closely rather than generating
  more levels. Levels 4-10 can be added later once 1-3 are confirmed
  right.
- Each level is a genuine 2-wide ring maze, not a straight corridor: an
  outer 2-wide loop with inward pockets, each pocket a box column plus an
  open bypass column so the player can always get behind a box to push it
  out of the pocket and around the ring (a 1-wide corridor can't do this —
  a box in a true dead end can never be pushed back out, and a player
  can't get "ahead" of an unmoved box in a single-width path). This
  matches the branching, looped corridor look of the PDF screenshots. Two
  earlier revisions (independent parallel corridors, then dead-end
  chambers each pairing one box with its own adjacent target) looked
  nothing like real Sokoban and gave every box an obvious, unambiguous
  single solution; both were dropped, then a straight-corridor "shared
  room" revision was replaced by this real 2D maze once clearer reference
  images showed the actual looped structure.
- **All targets for a level share one storage room attached to the
  ring** — box-to-target assignment is not 1:1, matching each reference
  screenshot's room shape: level 1 is a 2x3 grid on the right (6 boxes),
  level 2 is a single 8-target column on the left (8 boxes), level 3 is a
  3x3 grid on the left (9 boxes). Boxes are scattered separately through
  the ring's pockets. Pushing the wrong box first, or too far, can block
  the room entrance or a later box's path — real risk of a mistake, as
  opposed to a box sitting right next to its own target.
- Because pushes travel through a loop and can span dozens of cells, the
  exhaustive BFS checker in `tests/solver.js` can't verify these levels in
  reasonable time. Solvability is instead verified by
  `tests/maze-solver.js`, a generic 2D solve simulator that BFS-pathfinds
  the player between an explicit sequence of push segments (handling real
  turns around the ring, not just a straight line) and confirms a
  concrete, hand-designed solve plan for each level actually reaches the
  win state against the real engine (`tests/level-solutions.test.js`).
- Levels are data-only (`levels.js`), decoupled from rendering and engine
  logic — each level is a grid + metadata (name/floor number).
- **Every level fits entirely on one screen, like the original — no
  scrolling.** `render.js` computes the tile size per level (shrinking
  within a 10-48px range to fit the level's full width and height into the
  canvas) instead of using a fixed size, so the scattered boxes and the
  storage room are always visible together, matching the reference
  screenshots. A camera fallback (centered on the player, clamped to the
  level bounds) only activates for a level too large to stay legible even
  at the minimum tile size; none of the 3 shipped levels currently need
  it. The HUD is drawn in fixed screen space on top either way.

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
- **Background music**: a looping pentatonic melody, scheduled note by note
  (not a single sustained drone — that was tried first and was too faint to
  register as music) at an audible gain, playing throughout Level Play.
  Muting silences it without stopping the loop, so unmuting mid-level
  resumes it immediately.
- **Elevator ding**: a two-note chime when the call button is pressed in
  the Lobby.
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
3-face pseudo-3D cube (front/top/side). Walls use the same 3-face cube
language, viewed at a slight angle: a wall tile draws a lighter top face
wherever its top edge is actually exposed (nothing stacked above it), a
brick front face, and a skewed side face wherever its right edge is
exposed (nothing beside it) — so a wall reads as a genuine stacked 3D
block, not a flat decal, matching the PDF screenshots. Rendered on a
single `<canvas>` with a fixed tile size; the
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
