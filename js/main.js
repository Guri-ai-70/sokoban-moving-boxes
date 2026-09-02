(function () {
  const { parseLevel, tryMove, isWon } = window.SokobanEngine;
  const { LEVELS } = window.SokobanLevels;
  const { recordResult } = window.SokobanStorage;
  const audio = window.SokobanAudio;
  const { renderLevel, muteIconRect } = window.SokobanRender;
  const { renderLobby, renderKeypad, hitTestKeypad, hitTestCallButton } = window.SokobanKeypad;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const SCREEN = { LOBBY: 'lobby', CALLING: 'calling', KEYPAD: 'keypad', PLAY: 'play', COMPLETE: 'complete' };
  const DOOR_OPEN_MS = 900;

  let screen = SCREEN.LOBBY;
  let callStartTime = null;
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (screen === SCREEN.LOBBY) {
      if (hitTestCallButton(x, y, canvas.width, canvas.height)) callElevator();
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
    if (screen === SCREEN.PLAY) {
      const r = muteIconRect(canvas.width);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        audio.toggleMute();
      }
      return;
    }
    if (screen === SCREEN.COMPLETE) {
      screen = SCREEN.KEYPAD;
      selectedFloor = null;
    }
  });

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
})();
