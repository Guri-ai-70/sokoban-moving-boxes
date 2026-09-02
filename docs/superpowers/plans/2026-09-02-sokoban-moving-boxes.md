# Sokoban-Moving-Boxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable, browser-based Sokoban game with an elevator/keypad framing, 10 levels, undo, HUD, synthesized music/SFX, and localStorage best-times, per the approved design spec.

**Architecture:** Static HTML5 Canvas app, ES modules, no build step, no external dependencies. Pure logic (grid engine, level parsing, solver, HUD formatting, storage) is unit-tested with Node's built-in `node:test`/`node:assert`. Canvas rendering, audio, and full-game wiring are verified manually via browser preview, per the spec's testing approach.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML5 Canvas, Web Audio API, `localStorage`, Node.js built-in test runner (dev-only, not shipped to the browser).

## Global Constraints

- No external dependencies, no build step, no bundler — the game must run by opening `index.html` directly or via GitHub Pages.
- No copyrighted audio or art assets — all sound is synthesized in code (Web Audio oscillators/envelopes); all visuals are original, palette-inspired by the PDF screenshots, not pixel copies.
- All 10 levels selectable at any time from the keypad (no level locking).
- HUD format: `<floor>|moves:<n> pushes:<n> time:<h:mm:ss>` (zero-padded per the PDF screenshot).
- Controls: Arrow keys and WASD both move the player; `R` restarts the level; `U` or Backspace undoes; full undo history (not just one step).
- Level data uses this project's own tile notation (documented in `js/levels.js`), not strict XSB, to avoid whitespace-significant level strings:
  `#` wall, `_` floor, `T` target, `B` box, `P` player, `X` box-on-target, `Q` player-on-target.
- Node.js v22 is available in this environment (`node:test` works without flags).

---

### Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Produces: an `index.html` with a `<canvas id="game" width="800" height="600"></canvas>`, a `<script type="module" src="js/main.js"></script>` tag (main.js created in Task 8, so this tag will 404 until then — expected), and a page `<title>Sokoban - Moving Boxes</title>`.
- Produces: `css/style.css` with the base palette as CSS custom properties, used by later tasks:
  ```css
  :root {
    --sb-cyan: #35e0e8;
    --sb-brick: #b8262c;
    --sb-brick-dark: #7a1418;
    --sb-mortar: #e8b84a;
    --sb-target: #1a1a1a;
    --sb-player: #f2e9d8;
    --sb-hud-bg: #000000;
    --sb-hud-text: #35e0e8;
  }
  body {
    margin: 0;
    background: #000;
    color: var(--sb-hud-text);
    font-family: "Courier New", monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }
  canvas { image-rendering: pixelated; background: var(--sb-cyan); }
  ```

- [ ] **Step 1: Create `index.html`**

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sokoban - Moving Boxes</title>
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body>
    <canvas id="game" width="800" height="600"></canvas>
    <script type="module" src="js/main.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 2: Create `css/style.css`** with the content shown in Interfaces above.

- [ ] **Step 3: Create `.gitignore`**

  ```
  node_modules/
  *.log
  ```

- [ ] **Step 4: Create `README.md`**

  ```markdown
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
  ```

- [ ] **Step 5: Verify the page loads**

  Open `index.html` in a browser. Expected: a cyan canvas centered on a
  black page (the `main.js` 404 in the console is expected at this stage).

- [ ] **Step 6: Commit**

  ```bash
  git add index.html css/style.css README.md .gitignore
  git commit -m "Scaffold project: index.html, base styles, README"
  ```

---

### Task 2: Engine Core (grid, movement, push, win detection)

**Files:**
- Create: `js/engine.js`
- Test: `tests/engine.test.js`

**Interfaces:**
- Produces (used by Tasks 3, 4, 8):
  - `parseLevel(text: string): LevelState` — parses this project's tile
    notation into a state object:
    ```
    {
      width: number, height: number,
      walls: Set<string>,      // "x,y" keys
      targets: Set<string>,    // "x,y" keys
      boxes: Set<string>,      // "x,y" keys, mutable per state
      player: { x: number, y: number }
    }
    ```
  - `key(x: number, y: number): string` — returns `"x,y"`.
  - `tryMove(state: LevelState, dx: number, dy: number): { state: LevelState, moved: boolean, pushed: boolean }` —
    pure function; `dx`/`dy` are one of `{-1,0,1}` with exactly one nonzero.
    Returns a **new** `LevelState` (new `boxes` Set, same `walls`/`targets`)
    when the move succeeds; returns the **same** `state` reference with
    `moved:false` when blocked.
  - `isWon(state: LevelState): boolean` — true iff every target key is in `state.boxes`.
  - `cloneState(state: LevelState): LevelState` — shallow-clones `boxes` and `player` (used by the history stack in Task 8).

- [ ] **Step 1: Write the failing tests**

  ```javascript
  // tests/engine.test.js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { parseLevel, tryMove, isWon, key } from '../js/engine.js';

  test('parseLevel reads walls, floor, player, box, target', () => {
    const state = parseLevel('#####\n#TBP#\n#####');
    assert.equal(state.width, 5);
    assert.equal(state.height, 3);
    assert.deepEqual(state.player, { x: 3, y: 1 });
    assert.ok(state.boxes.has(key(2, 1)));
    assert.ok(state.targets.has(key(1, 1)));
    assert.ok(state.walls.has(key(0, 0)));
  });

  test('tryMove moves player onto open floor', () => {
    const state = parseLevel('#####\n#_P_#\n#####');
    const result = tryMove(state, -1, 0);
    assert.equal(result.moved, true);
    assert.equal(result.pushed, false);
    assert.deepEqual(result.state.player, { x: 1, y: 1 });
  });

  test('tryMove is blocked by a wall', () => {
    const state = parseLevel('#####\n#P__#\n#####');
    const result = tryMove(state, -1, 0);
    assert.equal(result.moved, false);
    assert.equal(result.state, state);
  });

  test('tryMove pushes a box onto open floor', () => {
    const state = parseLevel('#####\n#PB_#\n#####');
    const result = tryMove(state, 1, 0);
    assert.equal(result.moved, true);
    assert.equal(result.pushed, true);
    assert.deepEqual(result.state.player, { x: 2, y: 1 });
    assert.ok(result.state.boxes.has(key(3, 1)));
    assert.ok(!result.state.boxes.has(key(2, 1)));
  });

  test('tryMove blocks a push into a wall', () => {
    const state = parseLevel('#####\n#PB##\n#####'.replace('B##', 'B##'));
    // box has no floor beyond it (wall immediately after)
    const s2 = parseLevel('####\n#PB#\n####');
    const result = tryMove(s2, 1, 0);
    assert.equal(result.moved, false);
  });

  test('tryMove blocks a push into another box', () => {
    const state = parseLevel('#####\n#PBB#\n#####');
    const result = tryMove(state, 1, 0);
    assert.equal(result.moved, false);
  });

  test('isWon is false until all boxes are on targets, true once they are', () => {
    const state = parseLevel('#####\n#TBP#\n#####');
    assert.equal(isWon(state), false);
    const pushed = tryMove(state, -1, 0);
    assert.equal(isWon(pushed.state), true);
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/engine.test.js`
  Expected: FAIL — `Cannot find module '../js/engine.js'`.

- [ ] **Step 3: Implement `js/engine.js`**

  ```javascript
  // js/engine.js
  export function key(x, y) {
    return `${x},${y}`;
  }

  export function parseLevel(text) {
    const rows = text.split('\n').filter((r) => r.length > 0);
    const height = rows.length;
    const width = Math.max(...rows.map((r) => r.length));
    const walls = new Set();
    const targets = new Set();
    const boxes = new Set();
    let player = null;

    rows.forEach((row, y) => {
      for (let x = 0; x < width; x++) {
        const ch = row[x] ?? '#';
        if (ch === '#') walls.add(key(x, y));
        if (ch === 'T' || ch === 'X' || ch === 'Q') targets.add(key(x, y));
        if (ch === 'B' || ch === 'X') boxes.add(key(x, y));
        if (ch === 'P' || ch === 'Q') player = { x, y };
      }
    });

    if (!player) throw new Error('Level has no player start position');
    return { width, height, walls, targets, boxes, player };
  }

  export function cloneState(state) {
    return {
      width: state.width,
      height: state.height,
      walls: state.walls,
      targets: state.targets,
      boxes: new Set(state.boxes),
      player: { x: state.player.x, y: state.player.y },
    };
  }

  export function tryMove(state, dx, dy) {
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    const nk = key(nx, ny);

    if (state.walls.has(nk)) return { state, moved: false, pushed: false };

    if (state.boxes.has(nk)) {
      const bx = nx + dx;
      const by = ny + dy;
      const bk = key(bx, by);
      if (state.walls.has(bk) || state.boxes.has(bk)) {
        return { state, moved: false, pushed: false };
      }
      const next = cloneState(state);
      next.boxes.delete(nk);
      next.boxes.add(bk);
      next.player = { x: nx, y: ny };
      return { state: next, moved: true, pushed: true };
    }

    const next = cloneState(state);
    next.player = { x: nx, y: ny };
    return { state: next, moved: true, pushed: false };
  }

  export function isWon(state) {
    for (const t of state.targets) {
      if (!state.boxes.has(t)) return false;
    }
    return true;
  }
  ```

- [ ] **Step 4: Run the tests to verify they pass**

  Run: `node --test tests/engine.test.js`
  Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add js/engine.js tests/engine.test.js
  git commit -m "Add Sokoban grid engine: parsing, movement, push, win detection"
  ```

---

### Task 3: Solver (BFS solvability checker, dev-only)

**Files:**
- Create: `tests/solver.js`
- Test: `tests/solver.test.js`

**Interfaces:**
- Consumes: `parseLevel`, `tryMove`, `isWon`, `key` from `js/engine.js` (Task 2).
- Produces (used by Task 4): `solve(state: LevelState): boolean` — returns
  `true` if a sequence of pushes exists that wins the level, `false`
  otherwise. Runs breadth-first over `(playerCell, boxSet)` states, capped
  at 200,000 visited states (returns `false` if the cap is hit, which is
  treated as "not solved" by callers).
- This module lives under `tests/` — it is a development/verification tool,
  not shipped to the browser runtime.

- [ ] **Step 1: Write the failing tests**

  ```javascript
  // tests/solver.test.js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { parseLevel } from '../js/engine.js';
  import { solve } from './solver.js';

  test('solve finds a solution for a trivially solvable level', () => {
    const state = parseLevel('#####\n#TBP#\n#####');
    assert.equal(solve(state), true);
  });

  test('solve returns false for a deadlocked level', () => {
    // box starts in a corner, not on a target, and can never be pushed out
    const state = parseLevel('####\n#BP#\n#T##\n####');
    assert.equal(solve(state), false);
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/solver.test.js`
  Expected: FAIL — `Cannot find module './solver.js'`.

- [ ] **Step 3: Implement `tests/solver.js`**

  ```javascript
  // tests/solver.js
  import { tryMove, isWon, key, cloneState } from '../js/engine.js';

  const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  function stateKey(state) {
    const boxKeys = [...state.boxes].sort().join('|');
    return `${key(state.player.x, state.player.y)}:${boxKeys}`;
  }

  export function solve(initialState, maxStates = 200000) {
    if (isWon(initialState)) return true;

    const seen = new Set([stateKey(initialState)]);
    const queue = [initialState];
    let visited = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      visited++;
      if (visited > maxStates) return false;

      for (const [dx, dy] of DIRS) {
        const { state: next, moved } = tryMove(current, dx, dy);
        if (!moved) continue;
        if (isWon(next)) return true;
        const k = stateKey(next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      }
    }
    return false;
  }
  ```

- [ ] **Step 4: Run the tests to verify they pass**

  Run: `node --test tests/solver.test.js`
  Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add tests/solver.js tests/solver.test.js
  git commit -m "Add BFS solvability checker for level verification"
  ```

---

### Task 4: Level Data (10 levels)

**Files:**
- Create: `js/levels.js`
- Test: `tests/levels.test.js`

**Interfaces:**
- Consumes: `parseLevel`, `key` from `js/engine.js`; `solve` from `tests/solver.js`.
- Produces (used by Tasks 8, 9): `export const LEVELS: { floor: number, name: string, text: string }[]`
  — an array of exactly 10 entries, `floor` 1-10, `text` in this project's
  tile notation (see Global Constraints).

Levels 1-3 are visually inspired by the PDF screenshots (branching brick
corridors, diamond-hatched target areas) but are original layouts in this
project's own notation — the screenshots' exact pixel layout can't be
reliably extracted from the images, so this is a deliberate adaptation, not
a literal transcription. Levels 4-10 are original, increasing box count
(1→5) and push distance for a difficulty ramp.

- [ ] **Step 1: Write the failing tests**

  ```javascript
  // tests/levels.test.js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { parseLevel } from '../js/engine.js';
  import { solve } from './solver.js';
  import { LEVELS } from '../js/levels.js';

  test('there are exactly 10 levels, numbered 1-10 in order', () => {
    assert.equal(LEVELS.length, 10);
    LEVELS.forEach((lvl, i) => assert.equal(lvl.floor, i + 1));
  });

  test('every level parses with equal box and target counts', () => {
    for (const lvl of LEVELS) {
      const state = parseLevel(lvl.text);
      assert.equal(
        state.boxes.size,
        state.targets.size,
        `level ${lvl.floor}: box/target count mismatch`
      );
      assert.ok(state.boxes.size > 0, `level ${lvl.floor}: has no boxes`);
    }
  });

  test('every level is solvable', () => {
    for (const lvl of LEVELS) {
      const state = parseLevel(lvl.text);
      assert.equal(solve(state), true, `level ${lvl.floor} is not solvable`);
    }
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/levels.test.js`
  Expected: FAIL — `Cannot find module '../js/levels.js'`.

- [ ] **Step 3: Implement `js/levels.js`**

  ```javascript
  // js/levels.js
  // Tile notation: # wall, _ floor, T target, B box, P player,
  // X box-on-target, Q player-on-target. See docs/superpowers/specs/
  // 2026-09-02-sokoban-moving-boxes-design.md for the full design.

  export const LEVELS = [
    {
      floor: 1,
      name: 'First Steps',
      text: ['#####', '#TBP#', '#####'].join('\n'),
    },
    {
      floor: 2,
      name: 'Long Hall',
      text: ['#########', '#P__B__T#', '#########'].join('\n'),
    },
    {
      floor: 3,
      name: 'Two Rooms',
      text: [
        '#########',
        '#P_B__T_#',
        '#_#######',
        '#__B__T_#',
        '#########',
      ].join('\n'),
    },
    {
      floor: 4,
      name: 'Three Rooms',
      text: [
        '#########',
        '#P_B__T_#',
        '#_#######',
        '#__B__T_#',
        '#_#######',
        '#__B__T_#',
        '#########',
      ].join('\n'),
    },
    {
      floor: 5,
      name: 'The Stretch',
      text: [
        '###########',
        '#P_B____T_#',
        '#_#########',
        '#__B____T_#',
        '#_#########',
        '#__B____T_#',
        '###########',
      ].join('\n'),
    },
    {
      floor: 6,
      name: 'Four Rooms',
      text: [
        '#########',
        '#P_B__T_#',
        '#_#######',
        '#__B__T_#',
        '#_#######',
        '#__B__T_#',
        '#_#######',
        '#__B__T_#',
        '#########',
      ].join('\n'),
    },
    {
      floor: 7,
      name: 'Four Stretched',
      text: [
        '###########',
        '#P_B____T_#',
        '#_#########',
        '#__B____T_#',
        '#_#########',
        '#__B____T_#',
        '#_#########',
        '#__B____T_#',
        '###########',
      ].join('\n'),
    },
    {
      floor: 8,
      name: 'The Long Four',
      text: [
        '#############',
        '#P_B______T_#',
        '#_###########',
        '#__B______T_#',
        '#_###########',
        '#__B______T_#',
        '#_###########',
        '#__B______T_#',
        '#############',
      ].join('\n'),
    },
    {
      floor: 9,
      name: 'Five Rooms',
      text: [
        '#########',
        '#P_B__T_#',
        '#_#######',
        '#__B__T_#',
        '#_#######',
        '#__B__T_#',
        '#_#######',
        '#__B__T_#',
        '#_#######',
        '#__B__T_#',
        '#########',
      ].join('\n'),
    },
    {
      floor: 10,
      name: 'Top Floor',
      text: [
        '#############',
        '#P_B______T_#',
        '#_###########',
        '#__B______T_#',
        '#_###########',
        '#__B______T_#',
        '#_###########',
        '#__B______T_#',
        '#_###########',
        '#__B______T_#',
        '#############',
      ].join('\n'),
    },
  ];
  ```

- [ ] **Step 4: Run the tests**

  Run: `node --test tests/levels.test.js`
  Expected: box/target-count and level-count tests PASS. The solvability
  test may FAIL for individual levels — this is expected on the first run
  of hand-authored mazes.

  If any level fails solvability: the row lengths in that level's `text`
  must be inconsistent (each row must be padded to the same character
  count, `#` included) or the push corridor must be blocked. Fix by
  re-counting characters in the failing row(s) against the level's other
  rows, or re-run with a debug script that prints `parseLevel(text).width`
  vs. each row's `.length` to find the mismatched row, then correct it.
  Re-run the test after each fix until all 10 levels pass.

- [ ] **Step 5: Run the tests to verify they pass**

  Run: `node --test tests/levels.test.js`
  Expected: PASS (3 tests, covering all 10 levels).

- [ ] **Step 6: Commit**

  ```bash
  git add js/levels.js tests/levels.test.js
  git commit -m "Add 10 level layouts, verified solvable"
  ```

---

### Task 5: Storage Module (mute preference + best times)

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces (used by Tasks 6, 9, 10):
  - `getMuted(): boolean` — reads `sokoban:muted` from storage, defaults `false`.
  - `setMuted(muted: boolean): void`
  - `getBestResult(floor: number): { moves: number, pushes: number, timeMs: number } | null` —
    reads `sokoban:best:<floor>`, `JSON.parse`d; returns `null` if absent or corrupt.
  - `recordResult(floor: number, result: { moves: number, pushes: number, timeMs: number }): boolean` —
    stores `result` for `floor` only if there's no existing best or
    `result.timeMs` is lower than the existing best; returns `true` if it
    updated the stored value.
  - `setStorageBackend(backend: { getItem(k): string|null, setItem(k, v): void }): void` —
    test/DI seam. Defaults to `globalThis.localStorage` if present, else an
    in-memory `Map`-backed fallback (so the module never throws in
    environments without `localStorage`, e.g. Node or privacy mode).

- [ ] **Step 1: Write the failing tests**

  ```javascript
  // tests/storage.test.js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import {
    getMuted, setMuted, getBestResult, recordResult, setStorageBackend,
  } from '../js/storage.js';

  function freshBackend() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, v),
    };
  }

  test('getMuted defaults to false, setMuted persists', () => {
    setStorageBackend(freshBackend());
    assert.equal(getMuted(), false);
    setMuted(true);
    assert.equal(getMuted(), true);
  });

  test('getBestResult returns null when nothing stored', () => {
    setStorageBackend(freshBackend());
    assert.equal(getBestResult(1), null);
  });

  test('recordResult stores the first result and reports an update', () => {
    setStorageBackend(freshBackend());
    const updated = recordResult(1, { moves: 10, pushes: 3, timeMs: 5000 });
    assert.equal(updated, true);
    assert.deepEqual(getBestResult(1), { moves: 10, pushes: 3, timeMs: 5000 });
  });

  test('recordResult only overwrites when the new time is faster', () => {
    setStorageBackend(freshBackend());
    recordResult(1, { moves: 10, pushes: 3, timeMs: 5000 });
    const worse = recordResult(1, { moves: 20, pushes: 5, timeMs: 9000 });
    assert.equal(worse, false);
    assert.deepEqual(getBestResult(1), { moves: 10, pushes: 3, timeMs: 5000 });

    const better = recordResult(1, { moves: 8, pushes: 2, timeMs: 3000 });
    assert.equal(better, true);
    assert.deepEqual(getBestResult(1), { moves: 8, pushes: 2, timeMs: 3000 });
  });

  test('getBestResult returns null on corrupt stored data', () => {
    const backend = freshBackend();
    backend.setItem('sokoban:best:2', 'not-json{');
    setStorageBackend(backend);
    assert.equal(getBestResult(2), null);
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/storage.test.js`
  Expected: FAIL — `Cannot find module '../js/storage.js'`.

- [ ] **Step 3: Implement `js/storage.js`**

  ```javascript
  // js/storage.js
  let backend = defaultBackend();

  function defaultBackend() {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage;
    }
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, v),
    };
  }

  export function setStorageBackend(newBackend) {
    backend = newBackend;
  }

  export function getMuted() {
    return backend.getItem('sokoban:muted') === 'true';
  }

  export function setMuted(muted) {
    backend.setItem('sokoban:muted', String(muted));
  }

  export function getBestResult(floor) {
    const raw = backend.getItem(`sokoban:best:${floor}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  export function recordResult(floor, result) {
    const existing = getBestResult(floor);
    if (existing && existing.timeMs <= result.timeMs) return false;
    backend.setItem(`sokoban:best:${floor}`, JSON.stringify(result));
    return true;
  }
  ```

- [ ] **Step 4: Run the tests to verify they pass**

  Run: `node --test tests/storage.test.js`
  Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add js/storage.js tests/storage.test.js
  git commit -m "Add localStorage-backed mute preference and best-times tracking"
  ```

---

### Task 6: HUD Formatting

**Files:**
- Create: `js/hud.js`
- Test: `tests/hud.test.js`

**Interfaces:**
- Produces (used by Task 8): `formatHud(floor: number, moves: number, pushes: number, elapsedMs: number): string` —
  returns e.g. `"01|moves:0102 pushes:0039 time:0:01:22"` (floor
  zero-padded to 2 digits, moves/pushes zero-padded to 4 digits, time as
  `h:mm:ss` with minutes/seconds zero-padded to 2 digits, hours unpadded).

- [ ] **Step 1: Write the failing tests**

  ```javascript
  // tests/hud.test.js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { formatHud } from '../js/hud.js';

  test('formats floor, moves, pushes with zero padding', () => {
    assert.equal(
      formatHud(1, 102, 39, 82000),
      '01|moves:0102 pushes:0039 time:0:01:22'
    );
  });

  test('formats zero elapsed time', () => {
    assert.equal(
      formatHud(1, 0, 0, 0),
      '01|moves:0000 pushes:0000 time:0:00:00'
    );
  });

  test('formats times over an hour', () => {
    assert.equal(
      formatHud(10, 5, 1, 3661000),
      '10|moves:0005 pushes:0001 time:1:01:01'
    );
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/hud.test.js`
  Expected: FAIL — `Cannot find module '../js/hud.js'`.

- [ ] **Step 3: Implement `js/hud.js`**

  ```javascript
  // js/hud.js
  function pad(n, width) {
    return String(n).padStart(width, '0');
  }

  export function formatHud(floor, moves, pushes, elapsedMs) {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const time = `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
    return `${pad(floor, 2)}|moves:${pad(moves, 4)} pushes:${pad(pushes, 4)} time:${time}`;
  }
  ```

- [ ] **Step 4: Run the tests to verify they pass**

  Run: `node --test tests/hud.test.js`
  Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add js/hud.js tests/hud.test.js
  git commit -m "Add HUD string formatting for floor/moves/pushes/time"
  ```

---

### Task 7: Audio Module (synthesized music + SFX)

**Files:**
- Create: `js/audio.js`

**Interfaces:**
- Consumes: `getMuted`, `setMuted` from `js/storage.js` (Task 5).
- Produces (used by Task 10):
  - `initAudio(): void` — creates the shared `AudioContext` on first call
    (must be called from a user-gesture handler, e.g. the first keypress/click,
    to satisfy browser autoplay policies).
  - `playPing(): void` — short gentle blip on every player move.
  - `playThunk(): void` — low thunk when a box lands on/leaves a target.
  - `playEncouragement(): void` — short 4-note upbeat arpeggio on level completion.
  - `startMusic(): void` / `stopMusic(): void` — soft looping background pad, low gain, started on entering Level Play and stopped on leaving it.
  - `toggleMute(): boolean` — flips and persists mute state via `js/storage.js`, returns the new muted value; all playback functions no-op while muted.

This module has no automated tests — `AudioContext` isn't available in the
Node test environment and faking it would test the fake, not real audio
behavior. Verify manually per Step 4 below (also re-verified end-to-end in
Task 10).

- [ ] **Step 1: Implement `js/audio.js`**

  ```javascript
  // js/audio.js
  import { getMuted, setMuted } from './storage.js';

  let ctx = null;
  let musicNodes = null;

  export function initAudio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function tone(freq, startOffset, duration, type = 'sine', peakGain = 0.15) {
    if (!ctx || getMuted()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  export function playPing() {
    tone(880, 0, 0.08, 'square', 0.08);
  }

  export function playThunk() {
    tone(160, 0, 0.15, 'triangle', 0.2);
  }

  export function playEncouragement() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => tone(freq, i * 0.12, 0.25, 'square', 0.12));
  }

  export function startMusic() {
    if (!ctx || getMuted() || musicNodes) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 220;
    gain.gain.value = 0.03;
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start();

    musicNodes = { osc, gain, lfo };
  }

  export function stopMusic() {
    if (!musicNodes) return;
    const { osc, gain, lfo } = musicNodes;
    const t0 = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0, t0 + 0.3);
    osc.stop(t0 + 0.35);
    lfo.stop(t0 + 0.35);
    musicNodes = null;
  }

  export function toggleMute() {
    const next = !getMuted();
    setMuted(next);
    if (next) stopMusic();
    return next;
  }
  ```

- [ ] **Step 2: Manual verification (deferred to Task 10)**

  This module can't be exercised standalone without the game loop calling
  it from a user gesture. It's verified as part of Task 10's manual
  playthrough (music loops softly during play, ping on move, thunk on
  target, encouragement on completion, mute toggle silences everything).

- [ ] **Step 3: Commit**

  ```bash
  git add js/audio.js
  git commit -m "Add synthesized background music and sound effects"
  ```

---

### Task 8: Canvas Rendering (level + HUD)

**Files:**
- Create: `js/render.js`

**Interfaces:**
- Consumes: `LevelState` shape from `js/engine.js`; `formatHud` from `js/hud.js`.
- Produces (used by Task 10):
  - `TILE_SIZE: number` — exported constant (e.g. `48`).
  - `renderLevel(ctx: CanvasRenderingContext2D, state: LevelState, floor: number, moves: number, pushes: number, elapsedMs: number): void` —
    clears the canvas and draws: cyan floor, red-brick walls (with a darker
    mortar-line grid), diamond-hatched target tiles, a simple player sprite
    (a circle with a direction-agnostic body — direction handling is out of
    scope for v1), box sprites (a filled square with a border; a distinct
    fill color when a box sits on a target), and the HUD bar text (from
    `formatHud`) along the bottom of the canvas in `--sb-hud-text` on a
    `--sb-hud-bg` strip.

- [ ] **Step 1: Implement `js/render.js`**

  ```javascript
  // js/render.js
  import { isWon } from './engine.js';
  import { formatHud } from './hud.js';

  export const TILE_SIZE = 48;
  const HUD_HEIGHT = 32;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function drawWall(ctx, px, py) {
    ctx.fillStyle = cssVar('--sb-brick');
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = cssVar('--sb-brick-dark');
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.beginPath();
    ctx.moveTo(px, py + TILE_SIZE / 2);
    ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
    ctx.stroke();
  }

  function drawTarget(ctx, px, py) {
    ctx.fillStyle = cssVar('--sb-cyan');
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = cssVar('--sb-target');
    ctx.lineWidth = 2;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const r = TILE_SIZE / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.stroke();
  }

  function drawBox(ctx, px, py, onTarget) {
    ctx.fillStyle = onTarget ? '#e0a83a' : '#8a5a2a';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.strokeStyle = '#3a2510';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
  }

  function drawPlayer(ctx, px, py) {
    ctx.fillStyle = cssVar('--sb-player');
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  export function renderLevel(ctx, state, floor, moves, pushes, elapsedMs) {
    const canvas = ctx.canvas;
    ctx.fillStyle = cssVar('--sb-cyan');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const k = `${x},${y}`;
        if (state.walls.has(k)) {
          drawWall(ctx, px, py);
        } else if (state.targets.has(k)) {
          drawTarget(ctx, px, py);
        }
      }
    }

    for (const b of state.boxes) {
      const [x, y] = b.split(',').map(Number);
      drawBox(ctx, x * TILE_SIZE, y * TILE_SIZE, state.targets.has(b));
    }

    drawPlayer(ctx, state.player.x * TILE_SIZE, state.player.y * TILE_SIZE);

    const hudY = canvas.height - HUD_HEIGHT;
    ctx.fillStyle = cssVar('--sb-hud-bg');
    ctx.fillRect(0, hudY, canvas.width, HUD_HEIGHT);
    ctx.fillStyle = cssVar('--sb-hud-text');
    ctx.font = '18px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatHud(floor, moves, pushes, elapsedMs), 8, hudY + HUD_HEIGHT / 2);

    return isWon(state);
  }
  ```

- [ ] **Step 2: Manual verification (deferred to Task 10)**

  Rendering can't be meaningfully asserted without a browser; it's checked
  visually as part of Task 10's manual playthrough (walls/targets/boxes/
  player render with the right colors, HUD text updates and matches the
  `formatHud` output, box color changes when placed on a target).

- [ ] **Step 3: Commit**

  ```bash
  git add js/render.js
  git commit -m "Add canvas rendering for the level grid and HUD bar"
  ```

---

### Task 9: Lobby & Elevator Keypad Screen

**Files:**
- Create: `js/keypad.js`

**Interfaces:**
- Consumes: `getBestResult` from `js/storage.js`; `LEVELS` from `js/levels.js`.
- Produces (used by Task 10):
  - `renderLobby(ctx: CanvasRenderingContext2D): void` — draws the static
    elevator-lobby scene (original art: elevator doors, simple character
    silhouette, "press any key" prompt).
  - `renderKeypad(ctx: CanvasRenderingContext2D, selectedFloor: number | null): void` —
    draws a 2x5 (or similar) grid of floor buttons 1-10 plus CLEAR/ACCEPT,
    highlighting `selectedFloor` if set, and — for any floor with a stored
    best result — a small best-time readout under that button using
    `getBestResult(floor)`.
  - `hitTestKeypad(x: number, y: number): { type: 'floor', floor: number } | { type: 'clear' } | { type: 'accept' } | null` —
    canvas-coordinate hit testing for click handling, using the same
    button layout `renderKeypad` draws (button rects defined once as a
    shared constant in this module so drawing and hit-testing can't drift
    apart).

- [ ] **Step 1: Implement `js/keypad.js`**

  ```javascript
  // js/keypad.js
  import { getBestResult } from './storage.js';
  import { LEVELS } from './levels.js';

  const COLS = 5;
  const BTN_W = 90;
  const BTN_H = 60;
  const GRID_LEFT = 40;
  const GRID_TOP = 80;
  const GAP = 12;
  const CLEAR_ACCEPT_TOP = GRID_TOP + 2 * (BTN_H + GAP) + 20;

  function floorButtonRect(floor) {
    const i = floor - 1;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      x: GRID_LEFT + col * (BTN_W + GAP),
      y: GRID_TOP + row * (BTN_H + GAP),
      w: BTN_W,
      h: BTN_H,
    };
  }

  function clearButtonRect() {
    return { x: GRID_LEFT, y: CLEAR_ACCEPT_TOP, w: BTN_W, h: BTN_H };
  }

  function acceptButtonRect() {
    return { x: GRID_LEFT + BTN_W + GAP, y: CLEAR_ACCEPT_TOP, w: BTN_W * 2 + GAP, h: BTN_H };
  }

  export function renderLobby(ctx) {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = '#5a1a5a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(width / 2 - 80, height / 2 - 140, 160, 220);
    ctx.fillStyle = '#7ad0e0';
    ctx.fillRect(width / 2 - 60, height / 2 - 120, 50, 180);
    ctx.fillRect(width / 2 + 10, height / 2 - 120, 50, 180);
    ctx.fillStyle = '#f2e9d8';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 + 60, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width / 2 - 14, height / 2 + 78, 28, 60);
    ctx.fillStyle = '#35e0e8';
    ctx.font = '20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press any key to call the elevator', width / 2, height - 60);
    ctx.textAlign = 'left';
  }

  export function renderKeypad(ctx, selectedFloor) {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = '#3a1414';
    ctx.fillRect(0, 0, width, height);

    ctx.font = '16px "Courier New", monospace';
    for (const lvl of LEVELS) {
      const r = floorButtonRect(lvl.floor);
      ctx.fillStyle = selectedFloor === lvl.floor ? '#e0a83a' : '#7a2a2a';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#f2e9d8';
      ctx.textAlign = 'center';
      ctx.fillText(String(lvl.floor), r.x + r.w / 2, r.y + 22);

      const best = getBestResult(lvl.floor);
      if (best) {
        ctx.font = '11px "Courier New", monospace';
        ctx.fillText(`best ${best.moves}mv`, r.x + r.w / 2, r.y + 44);
        ctx.font = '16px "Courier New", monospace';
      }
    }

    const clear = clearButtonRect();
    ctx.fillStyle = '#555';
    ctx.fillRect(clear.x, clear.y, clear.w, clear.h);
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('CLEAR', clear.x + clear.w / 2, clear.y + clear.h / 2 + 5);

    const accept = acceptButtonRect();
    ctx.fillStyle = '#2a7a2a';
    ctx.fillRect(accept.x, accept.y, accept.w, accept.h);
    ctx.fillStyle = '#f2e9d8';
    ctx.fillText('ACCEPT', accept.x + accept.w / 2, accept.y + accept.h / 2 + 5);
    ctx.textAlign = 'left';
  }

  export function hitTestKeypad(x, y) {
    for (const lvl of LEVELS) {
      const r = floorButtonRect(lvl.floor);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { type: 'floor', floor: lvl.floor };
      }
    }
    const clear = clearButtonRect();
    if (x >= clear.x && x <= clear.x + clear.w && y >= clear.y && y <= clear.y + clear.h) {
      return { type: 'clear' };
    }
    const accept = acceptButtonRect();
    if (x >= accept.x && x <= accept.x + accept.w && y >= accept.y && y <= accept.y + accept.h) {
      return { type: 'accept' };
    }
    return null;
  }
  ```

- [ ] **Step 2: Manual verification (deferred to Task 10)**

  Verified visually as part of Task 10: lobby renders, keypad renders all
  10 floor buttons plus CLEAR/ACCEPT, clicking a floor highlights it,
  clicking ACCEPT with a floor selected transitions to that level, and
  best-time readouts appear after a level has been completed once.

- [ ] **Step 3: Commit**

  ```bash
  git add js/keypad.js
  git commit -m "Add elevator lobby and floor-select keypad screens"
  ```

---

### Task 10: Main State Machine (full game wiring)

**Files:**
- Create: `js/main.js`

**Interfaces:**
- Consumes: everything from Tasks 2-9 (`js/engine.js`, `js/levels.js`,
  `js/storage.js`, `js/audio.js`, `js/render.js`, `js/keypad.js`).
- Produces: the running game. No further module depends on this one.

- [ ] **Step 1: Implement `js/main.js`**

  ```javascript
  // js/main.js
  import { parseLevel, tryMove, isWon, cloneState } from './engine.js';
  import { LEVELS } from './levels.js';
  import { recordResult } from './storage.js';
  import * as audio from './audio.js';
  import { renderLevel, TILE_SIZE } from './render.js';
  import { renderLobby, renderKeypad, hitTestKeypad } from './keypad.js';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const SCREEN = { LOBBY: 'lobby', KEYPAD: 'keypad', PLAY: 'play', COMPLETE: 'complete' };

  let screen = SCREEN.LOBBY;
  let selectedFloor = null;
  let currentLevel = null; // { floor, state }
  let history = []; // [{ state, pushed }]
  let moves = 0;
  let pushes = 0;
  let startTime = null;
  let lastStats = null;
  let audioStarted = false;

  function ensureAudio() {
    if (!audioStarted) {
      audio.initAudio();
      audioStarted = true;
    }
  }

  function loadLevel(floor) {
    const def = LEVELS.find((l) => l.floor === floor);
    currentLevel = { floor, state: parseLevel(def.text) };
    history = [];
    moves = 0;
    pushes = 0;
    startTime = null;
    screen = SCREEN.PLAY;
    audio.startMusic();
  }

  function elapsedMs() {
    return startTime ? Date.now() - startTime : 0;
  }

  function handlePlayMove(dx, dy) {
    if (!currentLevel) return;
    if (!startTime) startTime = Date.now();
    const { state, moved, pushed } = tryMove(currentLevel.state, dx, dy);
    if (!moved) return;
    history.push({ state: currentLevel.state, pushed });
    currentLevel.state = state;
    moves++;
    if (pushed) {
      pushes++;
      const boxKey = [...state.boxes].find((k) => !currentLevel.stalePrevBoxes?.has(k));
      audio.playThunk();
    } else {
      audio.playPing();
    }

    if (isWon(state)) {
      audio.stopMusic();
      audio.playEncouragement();
      lastStats = { moves, pushes, timeMs: elapsedMs() };
      recordResult(currentLevel.floor, lastStats);
      screen = SCREEN.COMPLETE;
    }
  }

  function undo() {
    if (history.length === 0) return;
    const entry = history.pop();
    currentLevel.state = entry.state;
    moves--;
    if (entry.pushed) pushes--;
  }

  function restart() {
    if (!currentLevel) return;
    loadLevel(currentLevel.floor);
  }

  window.addEventListener('keydown', (e) => {
    ensureAudio();
    if (screen === SCREEN.LOBBY) {
      screen = SCREEN.KEYPAD;
      return;
    }
    if (screen !== SCREEN.PLAY) return;

    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': handlePlayMove(0, -1); break;
      case 'ArrowDown': case 's': case 'S': handlePlayMove(0, 1); break;
      case 'ArrowLeft': case 'a': case 'A': handlePlayMove(-1, 0); break;
      case 'ArrowRight': case 'd': case 'D': handlePlayMove(1, 0); break;
      case 'u': case 'U': case 'Backspace': undo(); break;
      case 'r': case 'R': restart(); break;
      default: return;
    }
    e.preventDefault();
  });

  canvas.addEventListener('click', (e) => {
    ensureAudio();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (screen === SCREEN.LOBBY) {
      screen = SCREEN.KEYPAD;
      return;
    }
    if (screen === SCREEN.KEYPAD) {
      const hit = hitTestKeypad(x, y);
      if (!hit) return;
      if (hit.type === 'floor') selectedFloor = hit.floor;
      if (hit.type === 'clear') selectedFloor = null;
      if (hit.type === 'accept' && selectedFloor) loadLevel(selectedFloor);
      return;
    }
    if (screen === SCREEN.COMPLETE) {
      screen = SCREEN.KEYPAD;
      selectedFloor = null;
    }
  });

  function frame() {
    if (screen === SCREEN.LOBBY) {
      renderLobby(ctx);
    } else if (screen === SCREEN.KEYPAD) {
      renderKeypad(ctx, selectedFloor);
    } else if (screen === SCREEN.PLAY) {
      renderLevel(ctx, currentLevel.state, currentLevel.floor, moves, pushes, elapsedMs());
    } else if (screen === SCREEN.COMPLETE) {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#35e0e8';
      ctx.font = '28px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Floor Complete!', canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText(
        `moves:${lastStats.moves}  pushes:${lastStats.pushes}  time:${Math.round(lastStats.timeMs / 1000)}s`,
        canvas.width / 2, canvas.height / 2
      );
      ctx.fillText('Click to return to the elevator', canvas.width / 2, canvas.height / 2 + 40);
      ctx.textAlign = 'left';
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  ```

  Note: the unused `boxKey` line in `handlePlayMove` is leftover scaffolding
  — remove it during implementation (it has no effect and isn't needed;
  `pushed` alone is sufficient for the thunk trigger).

- [ ] **Step 2: Add the mute toggle UI**

  In `js/render.js`, add a small speaker glyph drawn in the top-right
  corner of the canvas during `SCREEN.PLAY` (reuse the existing `ctx.fillText`
  pattern with a `'🔊'`/`'🔇'` glyph based on `getMuted()` from
  `js/storage.js`), and in `js/main.js`'s click handler, add a hit-test for
  that corner rect (e.g. top-right 32x32px) that calls `audio.toggleMute()`
  when in `SCREEN.PLAY`.

- [ ] **Step 3: Manual playthrough verification**

  Start a static file server and open the game in the browser preview:

  ```bash
  npx --yes serve . -l 5173
  ```

  Then, in the browser:
  1. Confirm the Lobby scene renders; press any key → Keypad appears.
  2. Click floor 1, click ACCEPT → Level 1 loads, background music starts softly.
  3. Move the player with arrow keys and WASD; confirm a ping plays on each move.
  4. Push the box onto the target; confirm a thunk plays and the box's fill color changes.
  5. Confirm the level completes automatically, music stops, the encouragement sound plays, and the stats screen shows correct moves/pushes/time.
  6. Click to return to the Keypad; confirm floor 1 now shows a best-time readout.
  7. Load floor 1 again, make a move, then a push, then press `U`/Backspace; confirm the box and player positions, and the moves/pushes counts, revert correctly.
  8. Press `R` mid-level; confirm the level resets to its initial state and the timer/counters reset.
  9. Click the mute icon; confirm subsequent moves are silent, and reload the page to confirm the mute preference persisted.
  10. Repeat steps 2-5 for floor 10 to confirm a later, larger level also loads, renders, and completes correctly.

  Check the browser console for errors throughout (`read_console_messages`
  if using the automated preview tools) — expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add js/main.js js/render.js
  git commit -m "Wire up full game: state machine, input, audio, mute toggle"
  ```

---

### Task 11: Final Polish & Full Test Run

**Files:**
- Modify: `README.md` (only if manual testing in Task 10 surfaced control/behavior changes worth documenting)

- [ ] **Step 1: Run the full automated test suite**

  Run: `node --test tests/`
  Expected: all tests across `engine.test.js`, `solver.test.js`,
  `levels.test.js`, `storage.test.js`, `hud.test.js` PASS.

- [ ] **Step 2: Re-run the Task 10 manual playthrough checklist once more end-to-end**

  Confirms nothing regressed after Task 10 Step 2's mute-icon addition.

- [ ] **Step 3: Commit any final fixes**

  ```bash
  git add -A
  git commit -m "Final polish pass after full playthrough verification"
  ```

## Self-Review Notes

- **Spec coverage:** Lobby/Keypad/Play/Complete screens (Task 9, 10),
  engine + undo (Task 2, 10), 10 levels incl. 1-3 adapted from the PDF
  (Task 4), HUD format (Task 6, 8), background music/ping/thunk/
  encouragement/mute (Task 7, 10), best-times persistence (Task 5, 9),
  palette/visual style (Task 1, 8, 9) — all covered.
- **Placeholder scan:** no TBD/TODO markers; the one "leftover scaffolding"
  note in Task 10 Step 1 is a concrete instruction (delete this specific
  line), not an unresolved placeholder.
- **Type consistency:** `LevelState` shape (`width, height, walls, targets,
  boxes, player`) is identical across Tasks 2, 3, 4, 8. `tryMove`'s
  `{state, moved, pushed}` return shape is used consistently in Tasks 2, 3,
  10. `formatHud`'s signature matches its Task 6 definition and Task 8/10
  usage.
- **Scope:** single cohesive project, no decomposition needed.
