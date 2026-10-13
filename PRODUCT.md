# Product

## Platform
web

## Stack
Plain static HTML/CSS/JS. Classic `<script>` tags only (no ES modules) so
`index.html` keeps working when opened via `file://`. No build step, no
dependencies, no web fonts.

## Users
Casual puzzle players on desktop (keyboard) and on phones held in portrait
(finger taps). Some players are returning to beat their own best result
per floor.

## Product Purpose
A browser recreation of the classic 1987-style Sokoban box-pushing puzzle,
framed as an office elevator: call the elevator, pick a floor (1-10), and
solve that floor's puzzle.

## Positioning
A small, faithful, self-contained game. The elevator framing is the
product's identity; the puzzles are transcribed exactly from the original
level sheets.

## Operating Context
Short sessions. On a phone it must be fully playable one-handed in
portrait with no horizontal scrolling; on desktop the keyboard remains the
primary control.

## Capabilities and Constraints
- Game engine, levels, solver and saved-results logic are fixed and must
  not change (`engine.js`, `levels.js`, `storage.js`, `tests/`).
- Touch controls call the existing move / undo / restart functions.
- Static presentation: no animations or transitions.
- Sounds are generated in code (Web Audio API) and respect the mute
  setting, which defaults to muted.

## Brand Commitments
- Elevator framing (lobby, floor panel, floor indicator).
- Visual theme: "Brass & Terrazzo" - a 1950s office elevator (chosen by
  the owner on 2026-10-14). See DESIGN.md.

## Evidence on Hand
None beyond the game itself.

## Product Principles
- Legibility of the board beats ornament: walls, floor, targets, boxes and
  boxes-on-targets must be distinguishable at small tile sizes.
- Every control is reachable by keyboard and by a finger.

## Accessibility & Inclusion
Touch targets at least 48px (arrows at least 64px). Text contrast at least
4.5:1. Box-on-target state differs in brightness, not only hue. Buttons
carry accessible labels.
