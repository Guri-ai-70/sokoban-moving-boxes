(function () {
  const { parseLevel, tryMove, isWon } = window.SokobanEngine;
  const { LEVELS } = window.SokobanLevels;
  const { recordResult, clearAllResults, getMuted } = window.SokobanStorage;
  const audio = window.SokobanAudio;
  const {
    renderLevel, renderComplete, computeViewTransform, HUD_HEIGHT, setPixelRatio,
  } = window.SokobanRender;
  const { renderLobby, renderKeypad, hitTestKeypad } = window.SokobanKeypad;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  // The canvas fills the stage (everything below the top bar) at any
  // window size, growing on a big desktop screen and shrinking on a phone.
  // viewW/viewH are its size in CSS pixels -- the space every renderer and
  // hit test works in; the drawing buffer is that times the pixel ratio.
  let viewW = 0;
  let viewH = 0;
  let pixelRatio = 1;

  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    viewW = Math.max(1, Math.floor(rect.width));
    viewH = Math.max(1, Math.floor(rect.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(viewW * pixelRatio);
    canvas.height = Math.round(viewH * pixelRatio);
    setPixelRatio(canvas.width / viewW);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(stage);

  // Static presentation (see DESIGN.md): no door-opening, win-blink or
  // balloon animations -- every screen change is instant.
  const SCREEN = {
    LOBBY: 'lobby', KEYPAD: 'keypad', PLAY: 'play', COMPLETE: 'complete',
  };

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
    screen = SCREEN.KEYPAD;
    audio.playDing();
  }

  window.addEventListener('keydown', (e) => {
    if (window.SokobanSettings && window.SokobanSettings.isOpen()) return;
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
    // Convert from the element's displayed size to the CSS-pixel space the
    // renderers draw in (viewW x viewH) -- normally 1:1, but kept as a
    // ratio so a click can never drift off its button if the displayed
    // size and the last measured size ever differ (e.g. mid-resize).
    const x = (e.clientX - rect.left) * (viewW / rect.width);
    const y = (e.clientY - rect.top) * (viewH / rect.height);

    if (screen === SCREEN.LOBBY) {
      // Any click on the lobby screen calls the elevator, same as any
      // keypress -- it used to require landing exactly on the small call
      // button, which didn't match that keyboard behavior.
      callElevator();
      return;
    }
    if (screen === SCREEN.KEYPAD) {
      const hit = hitTestKeypad(x, y, viewW, viewH);
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
    const boardH = viewH - HUD_HEIGHT;
    const { ts, offsetX, offsetY } = computeViewTransform(currentLevel.state, viewW, boardH);
    if (clickY >= boardH) return;

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

  // ---- On-screen controls (touch-friendly HTML buttons). Each one calls
  // the same functions as the keyboard: handlePlayMove / undo / restart.
  const controls = document.getElementById('controls');
  const muteBtn = document.getElementById('btn-mute');
  const muteLabel = document.getElementById('mute-label');

  function onButton(el, action) {
    el.addEventListener('click', () => {
      ensureAudio();
      action();
    });
  }

  for (const btn of controls.querySelectorAll('.ctl-arrow')) {
    const dx = Number(btn.dataset.dx);
    const dy = Number(btn.dataset.dy);
    onButton(btn, () => {
      if (screen === SCREEN.PLAY) handlePlayMove(dx, dy);
    });
  }
  onButton(document.getElementById('btn-undo'), () => {
    if (screen === SCREEN.PLAY) undo();
  });
  onButton(document.getElementById('btn-restart'), () => {
    if (screen === SCREEN.PLAY) restart();
  });

  // aria-pressed = sound is ON; the visible label always names the state.
  function syncMuteButton() {
    const muted = getMuted();
    muteBtn.setAttribute('aria-pressed', String(!muted));
    muteLabel.textContent = muted ? 'Muted' : 'Sound on';
  }
  onButton(muteBtn, () => {
    audio.toggleMute();
    syncMuteButton();
  });
  syncMuteButton();

  // Touch controls only show while playing a floor.
  let controlsShown = null;
  function syncControls() {
    const show = screen === SCREEN.PLAY;
    if (show === controlsShown) return;
    controlsShown = show;
    controls.hidden = !show;
    resizeCanvas();
  }

  function frame() {
    syncControls();
    ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / viewH, 0, 0);
    if (screen === SCREEN.LOBBY) {
      renderLobby(ctx);
    } else if (screen === SCREEN.KEYPAD) {
      renderKeypad(ctx, selectedFloor);
    } else if (screen === SCREEN.PLAY) {
      renderLevel(ctx, currentLevel.state, currentLevel.floor, moves, pushes, elapsedMs());
    } else if (screen === SCREEN.COMPLETE) {
      // The solved board stays visible under the win card, frozen at the
      // final stats (the clock does not keep running behind it).
      renderLevel(ctx, currentLevel.state, currentLevel.floor, lastStats.moves, lastStats.pushes, lastStats.timeMs);
      renderComplete(ctx, lastStats, currentLevel.floor);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
