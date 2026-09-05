(function () {
  const { parseLevel, tryMove, isWon } = window.SokobanEngine;
  const { LEVELS } = window.SokobanLevels;
  const { recordResult, clearAllResults } = window.SokobanStorage;
  const audio = window.SokobanAudio;
  const { renderLevel, renderComplete, muteIconRect, computeViewTransform, HUD_HEIGHT } = window.SokobanRender;
  const { renderLobby, renderKeypad, hitTestKeypad } = window.SokobanKeypad;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const SCREEN = {
    LOBBY: 'lobby', CALLING: 'calling', KEYPAD: 'keypad', PLAY: 'play', WINNING: 'winning', COMPLETE: 'complete',
  };
  const DOOR_OPEN_MS = 900;
  const WIN_BLINK_MS = 3000;
  const WIN_BLINK_INTERVAL_MS = 250;

  let screen = SCREEN.LOBBY;
  let callStartTime = null;
  let selectedFloor = null;
  let currentLevel = null; // { floor, state }
  let history = []; // [{ state, pushed }]
  let moves = 0;
  let pushes = 0;
  let startTime = null;
  let lastStats = null;
  let winStartTime = null;
  let completeStartTime = null;
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
      audio.playThunk();
    } else {
      audio.playPing();
    }

    if (isWon(state)) {
      audio.stopMusic();
      audio.playEncouragement();
      lastStats = { moves, pushes, timeMs: elapsedMs() };
      recordResult(currentLevel.floor, lastStats);
      winStartTime = Date.now();
      screen = SCREEN.WINNING;
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

  function callElevator() {
    if (screen !== SCREEN.LOBBY) return;
    screen = SCREEN.CALLING;
    callStartTime = Date.now();
    audio.playDing();
  }

  window.addEventListener('keydown', (e) => {
    ensureAudio();
    if (screen === SCREEN.LOBBY) {
      callElevator();
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
    // Convert from CSS display pixels to the canvas's own drawing-buffer
    // coordinates -- if the element is ever displayed at a different
    // size than its width/height attributes (a narrower viewport, page
    // zoom, a responsive CSS rule), those two spaces diverge more the
    // further a button sits from the top-left corner, so a button near
    // the origin can look fine while one further down or right drifts
    // off its own hit box.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (screen === SCREEN.LOBBY) {
      // Any click on the lobby screen calls the elevator, same as any
      // keypress -- it used to require landing exactly on the small call
      // button, which didn't match that keyboard behavior.
      callElevator();
      return;
    }
    if (screen === SCREEN.KEYPAD) {
      const hit = hitTestKeypad(x, y);
      if (!hit) return;
      if (hit.type === 'floor') selectedFloor = hit.floor;
      if (hit.type === 'reset') {
        clearAllResults(LEVELS.length);
        selectedFloor = null;
      }
      if (hit.type === 'accept' && selectedFloor) loadLevel(selectedFloor);
      return;
    }
    if (screen === SCREEN.PLAY) {
      const r = muteIconRect(canvas.width);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        audio.toggleMute();
        return;
      }
      handlePlayClick(x, y);
      return;
    }
    if (screen === SCREEN.COMPLETE) {
      screen = SCREEN.KEYPAD;
      selectedFloor = null;
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (screen === SCREEN.PLAY) undo();
  });

  // Clicking a tile immediately next to the player (up/down/left/right)
  // moves/pushes in that direction, same as an arrow key -- clicking
  // anywhere else is ignored rather than guessing a multi-step path.
  function handlePlayClick(clickX, clickY) {
    if (!currentLevel) return;
    const viewW = canvas.width;
    const viewH = canvas.height - HUD_HEIGHT;
    const { ts, offsetX, offsetY } = computeViewTransform(currentLevel.state, viewW, viewH);
    if (clickY >= viewH) return;

    const gridX = Math.floor((clickX - offsetX) / ts);
    const gridY = Math.floor((clickY - offsetY) / ts);
    const { player } = currentLevel.state;
    const dx = gridX - player.x;
    const dy = gridY - player.y;
    if (dx === 0 && dy === -1) handlePlayMove(0, -1);
    else if (dx === 0 && dy === 1) handlePlayMove(0, 1);
    else if (dx === -1 && dy === 0) handlePlayMove(-1, 0);
    else if (dx === 1 && dy === 0) handlePlayMove(1, 0);
  }

  function frame() {
    if (screen === SCREEN.LOBBY) {
      renderLobby(ctx, 0, false);
    } else if (screen === SCREEN.CALLING) {
      const t = Date.now() - callStartTime;
      const slide = Math.min(1, t / DOOR_OPEN_MS);
      renderLobby(ctx, slide, true);
      if (t >= DOOR_OPEN_MS) {
        screen = SCREEN.KEYPAD;
      }
    } else if (screen === SCREEN.KEYPAD) {
      renderKeypad(ctx, selectedFloor);
    } else if (screen === SCREEN.PLAY) {
      renderLevel(ctx, currentLevel.state, currentLevel.floor, moves, pushes, elapsedMs());
    } else if (screen === SCREEN.WINNING) {
      const t = Date.now() - winStartTime;
      const hideBoxes = Math.floor(t / WIN_BLINK_INTERVAL_MS) % 2 === 1;
      renderLevel(ctx, currentLevel.state, currentLevel.floor, moves, pushes, elapsedMs(), hideBoxes);
      if (t >= WIN_BLINK_MS) {
        completeStartTime = Date.now();
        screen = SCREEN.COMPLETE;
      }
    } else if (screen === SCREEN.COMPLETE) {
      renderComplete(ctx, lastStats, Date.now() - completeStartTime);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
