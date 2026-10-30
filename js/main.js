(function () {
  const { parseLevel, tryMove, isWon, findPath } = window.SokobanEngine;
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
    cancelWalk();
    blockedFlash = null;
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

  // Click-to-move walk: one step every WALK_STEP_MS. Every step of a walk
  // is tagged with the same id in history, so a single undo rewinds it all.
  const WALK_STEP_MS = 50;
  const BLOCKED_FLASH_MS = 200;
  // On a win the plain solved board shows for WIN_PAUSE_MS before the card
  // appears; the card then ignores dismissals for WIN_CARD_GUARD_MS so
  // rapid taps/keys from the final move can't skip it.
  const WIN_PAUSE_MS = 250;
  const WIN_CARD_GUARD_MS = 400;
  let winCardAt = 0;
  let walkTimer = null;
  let walkSeq = 0;
  let blockedFlash = null; // { x, y, until }

  function cancelWalk() {
    if (walkTimer !== null) clearTimeout(walkTimer);
    walkTimer = null;
  }

  function signalBlocked(gridX, gridY) {
    const now = Date.now();
    // A held key against a wall repeats this every tick: keep the flash
    // alive but only sound/vibrate once per flash.
    const fresh = !blockedFlash || blockedFlash.until <= now;
    if (fresh) {
      audio.playBlocked();
      if (navigator.vibrate) navigator.vibrate(10);
    }
    blockedFlash = { x: gridX, y: gridY, until: now + BLOCKED_FLASH_MS };
  }

  function startWalk(steps) {
    const id = ++walkSeq;
    let i = 0;
    const tick = () => {
      walkTimer = null;
      if (screen !== SCREEN.PLAY || !currentLevel) return;
      if (!handlePlayMove(steps[i][0], steps[i][1], id)) return;
      if (++i < steps.length) walkTimer = setTimeout(tick, WALK_STEP_MS);
    };
    tick();
  }

  // walkId is set only for steps taken by a click-to-move walk; any other
  // move (keyboard, buttons, adjacent click) cancels a walk in progress.
  function handlePlayMove(dx, dy, walkId) {
    if (!currentLevel) return false;
    if (walkId === undefined) cancelWalk();
    if (!startTime) startTime = Date.now();
    const { state, moved, pushed } = tryMove(currentLevel.state, dx, dy);
    if (!moved) {
      if (walkId === undefined) {
        signalBlocked(currentLevel.state.player.x + dx, currentLevel.state.player.y + dy);
      }
      return false;
    }
    history.push({ state: currentLevel.state, pushed, walkId });
    currentLevel.state = state;
    moves++;
    const won = isWon(state);
    if (pushed) pushes++;
    // The winning push gets the bell alone -- no thunk on top of it.
    if (!won) {
      if (pushed) audio.playThunk();
      else audio.playPing();
    }

    if (won) {
      audio.stopMusic();
      audio.playBell();
      lastStats = { moves, pushes, timeMs: elapsedMs() };
      recordResult(currentLevel.floor, lastStats);
      winCardAt = Date.now() + WIN_PAUSE_MS;
      screen = SCREEN.COMPLETE;
    }
    return true;
  }

  function undo() {
    cancelWalk();
    if (history.length === 0) return;
    const walkId = history[history.length - 1].walkId;
    do {
      const entry = history.pop();
      currentLevel.state = entry.state;
      moves--;
      if (entry.pushed) pushes--;
    } while (
      walkId !== undefined && history.length > 0 && history[history.length - 1].walkId === walkId
    );
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
    if (screen === SCREEN.COMPLETE) {
      if (e.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      dismissComplete();
      e.preventDefault();
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

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    // Convert from the element's displayed size to the CSS-pixel space the
    // renderers draw in (viewW x viewH) -- normally 1:1, but kept as a
    // ratio so a click can never drift off its button if the displayed
    // size and the last measured size ever differ (e.g. mid-resize).
    return {
      x: (e.clientX - rect.left) * (viewW / rect.width),
      y: (e.clientY - rect.top) * (viewH / rect.height),
    };
  }

  // Board taps while playing react on press, not on release. The click
  // that follows the same press is then skipped (pressHandled).
  let pressHandled = false;
  canvas.addEventListener('pointerdown', (e) => {
    pressHandled = false;
    if (screen !== SCREEN.PLAY || !e.isPrimary || e.button !== 0) return;
    ensureAudio();
    const { x, y } = canvasPoint(e);
    handlePlayClick(x, y);
    pressHandled = true;
  });

  canvas.addEventListener('click', (e) => {
    ensureAudio();
    if (pressHandled) {
      pressHandled = false;
      return;
    }
    const { x, y } = canvasPoint(e);

    if (screen === SCREEN.LOBBY) {
      // Any click on the lobby screen calls the elevator, same as any
      // keypress -- it used to require landing exactly on the small call
      // button, which didn't match that keyboard behavior.
      audio.playClick();
      callElevator();
      return;
    }
    if (screen === SCREEN.KEYPAD) {
      const hit = hitTestKeypad(x, y, viewW, viewH);
      if (!hit) return;
      audio.playClick();
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
    if (screen === SCREEN.COMPLETE) dismissComplete();
  });

  function dismissComplete() {
    if (Date.now() < winCardAt + WIN_CARD_GUARD_MS) return;
    audio.playClick();
    screen = SCREEN.KEYPAD;
    selectedFloor = null;
  }

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (screen === SCREEN.PLAY) undo();
  });

  // Clicking a tile next to the player (up/down/left/right) moves/pushes in
  // that direction, same as an arrow key. Clicking any other empty floor
  // walks there by the shortest path (never pushing); anything that can't be
  // walked to gives the "blocked" signal.
  function handlePlayClick(clickX, clickY) {
    if (!currentLevel) return;
    const boardH = viewH - HUD_HEIGHT;
    const { ts, offsetX, offsetY } = computeViewTransform(currentLevel.state, viewW, boardH);
    if (clickY >= boardH) return;
    cancelWalk();

    const gridX = Math.floor((clickX - offsetX) / ts);
    const gridY = Math.floor((clickY - offsetY) / ts);
    const state = currentLevel.state;
    const dx = gridX - state.player.x;
    const dy = gridY - state.player.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      handlePlayMove(dx, dy); // signals blocked itself
      return;
    }
    const steps = findPath(state, gridX, gridY);
    if (steps) startWalk(steps);
    else signalBlocked(gridX, gridY);
  }

  function renderBlockedFlash() {
    if (!blockedFlash) return;
    const left = blockedFlash.until - Date.now();
    if (left <= 0) {
      blockedFlash = null;
      return;
    }
    const boardH = viewH - HUD_HEIGHT;
    const { ts, offsetX, offsetY } = computeViewTransform(currentLevel.state, viewW, boardH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewW, boardH);
    ctx.clip();
    ctx.fillStyle = `rgba(220, 50, 40, ${0.55 * (left / BLOCKED_FLASH_MS)})`;
    ctx.fillRect(offsetX + blockedFlash.x * ts, offsetY + blockedFlash.y * ts, ts, ts);
    ctx.restore();
  }

  // ---- On-screen controls (touch-friendly HTML buttons). Each one calls
  // the same functions as the keyboard: handlePlayMove / undo / restart.
  const controls = document.getElementById('controls');
  const muteBtn = document.getElementById('btn-mute');
  const muteLabel = document.getElementById('mute-label');

  // Every button tap also unlocks audio (iOS needs a user gesture). The
  // arrows deliberately don't click: each move already plays its own step
  // or push sound, and a click on top would double it.
  function onButton(el, action, click = true) {
    el.addEventListener('click', () => {
      ensureAudio();
      action();
      if (click) audio.playClick();
    });
  }

  for (const btn of controls.querySelectorAll('.ctl-arrow')) {
    const dx = Number(btn.dataset.dx);
    const dy = Number(btn.dataset.dy);
    const press = () => {
      ensureAudio();
      if (screen === SCREEN.PLAY) handlePlayMove(dx, dy);
    };
    // Move on press; the click that follows a press is ignored, and a
    // click with no press (keyboard Enter/Space on the button) still moves.
    let pressed = false;
    btn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pressed = true;
      press();
    });
    btn.addEventListener('click', () => {
      if (pressed) pressed = false;
      else press();
    });
  }
  onButton(document.getElementById('btn-undo'), () => {
    if (screen === SCREEN.PLAY) undo();
  });
  onButton(document.getElementById('btn-restart'), () => {
    if (screen === SCREEN.PLAY) restart();
  });

  // Settings panel (js/settings.js owns its behaviour; this only adds the
  // tap sound).
  onButton(document.getElementById('btn-settings'), () => {});
  onButton(document.getElementById('settings-done'), () => {});
  window.SokobanSettings.onOptionChosen(() => {
    ensureAudio();
    audio.playClick();
  });

  // aria-pressed = sound is ON; the visible label always names the state.
  function syncMuteButton() {
    const muted = getMuted();
    muteBtn.setAttribute('aria-pressed', String(!muted));
    muteLabel.textContent = muted ? 'Muted' : 'Sound on';
  }
  // Toggle first, then click (onButton): the click is heard when sound is
  // switched on, and stays silent when it is switched off.
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
      renderBlockedFlash();
    } else if (screen === SCREEN.COMPLETE) {
      // The solved board stays visible under the win card, frozen at the
      // final stats (the clock does not keep running behind it).
      renderLevel(ctx, currentLevel.state, currentLevel.floor, lastStats.moves, lastStats.pushes, lastStats.timeMs);
      if (Date.now() >= winCardAt) renderComplete(ctx, lastStats, currentLevel.floor);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
