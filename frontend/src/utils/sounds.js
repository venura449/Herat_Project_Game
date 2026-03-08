// utils/sounds.js - Procedural sound effects via the Web Audio API
// No external audio files needed — all sounds are synthesised at runtime.
// Each function catches and silences errors so a missing AudioContext
// (e.g. unit-test environment) never breaks the game.

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Chrome suspends the context until the first user gesture; resume if needed.
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** Rising two-tone ding — plays on a correct answer */
export function playDing() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* silenced — audio permission denied or unsupported */ }
}

/** Descending sawtooth buzz — plays on a wrong answer */
export function playBuzzer() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.32);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
  } catch { /* silenced */ }
}

/** Short square-wave tick — plays each second of the blitz countdown */
export function playTick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  } catch { /* silenced */ }
}

// ── Background music ───────────────────────────────────────────────────────
let bgAudio = null;

/** Start looping background music. Safe to call multiple times. */
export function startBgMusic() {
  try {
    if (!bgAudio) {
      bgAudio = new Audio('/bg-music.mpeg');
      bgAudio.loop = true;
      bgAudio.volume = 0.3;
    }
    if (bgAudio.paused) bgAudio.play().catch(() => { });
  } catch { /* silenced */ }
}

/** Pause background music and reset to start. */
export function stopBgMusic() {
  try {
    if (bgAudio && !bgAudio.paused) {
      bgAudio.pause();
      bgAudio.currentTime = 0;
    }
  } catch { /* silenced */ }
}
