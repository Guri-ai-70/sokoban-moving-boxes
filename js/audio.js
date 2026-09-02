(function (global, factory) {
  const api = factory(global.SokobanStorage);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanAudio = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanStorage) {
  const { getMuted, setMuted } = SokobanStorage;

  let ctx = null;
  let musicNodes = null;

  function initAudio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
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

  function playPing() {
    tone(880, 0, 0.08, 'square', 0.08);
  }

  function playThunk() {
    tone(160, 0, 0.15, 'triangle', 0.2);
  }

  function playEncouragement() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => tone(freq, i * 0.12, 0.25, 'square', 0.12));
  }

  function startMusic() {
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

  function stopMusic() {
    if (!musicNodes) return;
    const { osc, gain, lfo } = musicNodes;
    const t0 = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0, t0 + 0.3);
    osc.stop(t0 + 0.35);
    lfo.stop(t0 + 0.35);
    musicNodes = null;
  }

  function toggleMute() {
    const next = !getMuted();
    setMuted(next);
    if (next) stopMusic();
    return next;
  }

  return { initAudio, playPing, playThunk, playEncouragement, startMusic, stopMusic, toggleMute };
});
