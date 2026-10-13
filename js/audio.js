(function (global, factory) {
  const api = factory(global.SokobanStorage);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanAudio = api;
})(typeof window !== 'undefined' ? window : globalThis, function (SokobanStorage) {
  const { getMuted, setMuted } = SokobanStorage;

  let ctx = null;

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
    tone(880, 0, 0.08, 'square', 0.14);
  }

  function playThunk() {
    tone(160, 0, 0.15, 'triangle', 0.3);
  }

  function playDing() {
    tone(1046.5, 0, 0.4, 'sine', 0.16);
    tone(1318.5, 0.1, 0.4, 'sine', 0.12);
  }

  // Short mechanical "click" for button taps: a bright triangle blip that
  // drops in pitch and dies away in ~40ms -- no slow attack, so it lands
  // on the tap itself.
  function playClick() {
    if (!ctx || getMuted()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, t0);
    osc.frequency.exponentialRampToValueAtTime(700, t0 + 0.03);
    gain.gain.setValueAtTime(0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.06);
  }

  // Struck-bell "ding" for a solved floor: a stack of sine partials at
  // classic church-bell ratios (hum, prime, tierce, quint, nominal...),
  // each with an instant strike and its own exponential ring-out, the
  // higher partials fading first -- like a hotel desk bell.
  const BELL_PARTIALS = [
    // [ratio to the strike note, peak gain, ring-out seconds]
    [0.5, 0.06, 1.6],
    [1, 0.16, 1.4],
    [1.2, 0.06, 1.0],
    [1.5, 0.05, 0.9],
    [2, 0.08, 0.8],
    [2.74, 0.04, 0.5],
    [3.76, 0.025, 0.35],
  ];

  function playBell() {
    if (!ctx || getMuted()) return;
    const strike = 1046.5; // C6
    const t0 = ctx.currentTime;
    for (const [ratio, peak, ring] of BELL_PARTIALS) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = strike * ratio;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ring);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + ring + 0.05);
    }
  }

  function playEncouragement() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => tone(freq, i * 0.12, 0.25, 'square', 0.2));
  }

  // Simple looping pentatonic melody (A minor pentatonic), scheduled note
  // by note rather than a single drone tone, so it's clearly audible and
  // musical rather than a faint background hum.
  const MELODY = [
    220.0, 261.63, 293.66, 329.63, 392.0,
    329.63, 293.66, 261.63, 220.0, 293.66,
    261.63, 220.0, 196.0, 220.0, 261.63, 293.66,
  ];
  const NOTE_MS = 380;
  let musicTimer = null;
  let musicStep = 0;

  function scheduleMusicNote() {
    const freq = MELODY[musicStep % MELODY.length];
    tone(freq, 0, NOTE_MS / 1000 + 0.1, 'triangle', 0.09);
    tone(freq / 2, 0, NOTE_MS / 1000 + 0.1, 'sine', 0.05);
    musicStep++;
    musicTimer = setTimeout(scheduleMusicNote, NOTE_MS);
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    musicStep = 0;
    scheduleMusicNote();
  }

  function stopMusic() {
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  function toggleMute() {
    const next = !getMuted();
    setMuted(next);
    return next;
  }

  return {
    initAudio, playPing, playThunk, playDing, playEncouragement, playClick, playBell,
    startMusic, stopMusic, toggleMute,
  };
});
