/**
 * Hybrid audio handler for split-flap sound effects.
 * - HTML5 Audio for spin loop (started synchronously in user gesture)
 * - Web Audio API for per-second clicks (AudioContext stays unlocked after gesture)
 * - Pre-unlocked HTML5 Audio click pool as fallback
 */

let soundEnabled = false;
let audioUnlocked = false;
let isSpinning = false;

let spinAudio: HTMLAudioElement | null = null;

let clickPool: HTMLAudioElement[] = [];
let clickPoolIndex = 0;

let webCtx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let webAudioReady = false;

let keepaliveOsc: OscillatorNode | null = null;
let keepaliveGain: GainNode | null = null;

const SPIN_PATH = '/sounds/splitflap-click.mp3';
const TICK_PATH = '/sounds/splitflap-tick.mp3';
const POOL_SIZE = 4;

function log(msg: string) {
  console.log(`[audio] ${msg}`);
}

function createSpinAudio() {
  if (spinAudio) return;
  spinAudio = new Audio(SPIN_PATH);
  spinAudio.preload = 'auto';
  spinAudio.loop = true;
  spinAudio.volume = 0.5;
  spinAudio.playbackRate = 1.0;
}

function createClickPool() {
  if (clickPool.length > 0) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const a = new Audio(TICK_PATH);
    a.preload = 'auto';
    a.volume = 0.7;
    clickPool.push(a);
  }
}

function startKeepalive() {
  if (!webCtx || keepaliveOsc) return;
  try {
    keepaliveOsc = webCtx.createOscillator();
    keepaliveGain = webCtx.createGain();
    keepaliveGain.gain.value = 0.0001; // Non-zero: prevents Chrome auto-suspend of "silent" graph
    keepaliveOsc.connect(keepaliveGain);
    keepaliveGain.connect(webCtx.destination);
    keepaliveOsc.start(0);
  } catch (e: any) {
    log(`keepalive err: ${e?.message}`);
  }
}

function stopKeepalive() {
  if (keepaliveOsc) {
    try { keepaliveOsc.stop(); } catch {}
    keepaliveOsc.disconnect();
    keepaliveOsc = null;
  }
  if (keepaliveGain) {
    keepaliveGain.disconnect();
    keepaliveGain = null;
  }
}

async function initWebAudio(): Promise<void> {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    // Create context only if not already created synchronously in enableAndPlay()
    if (!webCtx) {
      webCtx = new AC();
    }
    if (webCtx.state === 'suspended') await webCtx.resume();

    const silent = webCtx.createBuffer(1, 1, 22050);
    const node = webCtx.createBufferSource();
    node.buffer = silent;
    node.connect(webCtx.destination);
    node.start(0);

    const response = await fetch(TICK_PATH);
    if (!response.ok) return;
    const arrayBuf = await response.arrayBuffer();
    clickBuffer = await webCtx.decodeAudioData(arrayBuf);
    webAudioReady = true;

    startKeepalive();
  } catch (e: any) {
    log(`Web Audio init failed: ${e?.message}`);
    webAudioReady = false;
  }
}

export function enableAndPlay(): void {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');

  // Create and resume AudioContext synchronously here, while we are inside the
  // user-gesture call stack. iOS only grants AudioContext.resume() permission
  // when called synchronously within a gesture — async calls (e.g. inside
  // initWebAudio's await chain) arrive after the gesture window closes and fail
  // silently, leaving the context suspended and killing ticks after the spin.
  if (!webCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      webCtx = new AC();
      webCtx.resume().catch(() => {}); // synchronous gesture → iOS grants this
    }
  } else if (webCtx.state === 'suspended') {
    webCtx.resume().catch(() => {});
  }

  createSpinAudio();
  createClickPool();

  for (const a of clickPool) {
    a.muted = true;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    }).catch(() => {});
  }

  if (spinAudio) {
    spinAudio.muted = false;
    spinAudio.currentTime = 0;
    spinAudio.volume = 0.5;
    spinAudio.play().then(() => {
      log('spin playing');
    }).catch(e => log(`spin play err: ${e?.message}`));
    isSpinning = true;
    // Guarantee spin stops after the 2s animation window even when sound is
    // enabled after initialLoad is already false (the animation useEffect's
    // stopSpin() never runs in that code path, leaving the loop playing forever).
    setTimeout(() => stopSpin(), 2000);
  }

  audioUnlocked = true;
  initWebAudio();
}

export function enableSound(): void {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
}

export function disableSound(): void {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  // Fully stop everything — user explicitly wants silence
  if (spinAudio) {
    spinAudio.muted = false;
    spinAudio.pause();
    spinAudio.currentTime = 0;
  }
  isSpinning = false;
  stopKeepalive();
}

export function isAudioReady(): boolean {
  return audioUnlocked;
}

export async function waitForAudio(): Promise<void> {
  return;
}

export function playClick(): void {
  if (!soundEnabled) return;
  // Check actual audio state instead of isSpinning flag, which can desync when
  // enableAndPlay() is called after the initial animation has already completed
  // (isSpinning stays true with no stopSpin() ever called in that code path).
  // Only suppress ticks when spin is audibly playing (not in muted keepalive mode)
  if (spinAudio && !spinAudio.paused && !spinAudio.muted) return;

  log(`playClick: webAudioReady=${webAudioReady} ctx=${webCtx?.state ?? 'null'} buf=${!!clickBuffer} pool=${clickPool.length}`);

  if (webAudioReady && webCtx && clickBuffer && webCtx.state === 'running') {
    try {
      const source = webCtx.createBufferSource();
      source.buffer = clickBuffer;
      const gain = webCtx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(webCtx.destination);
      source.start(0);
      log('playClick: web audio OK');
      return;
    } catch (e: any) {
      log(`playClick: web audio err: ${e?.message}`);
    }
  }

  // Fallback: HTML5 Audio pool (handles iOS when AudioContext is suspended)
  if (clickPool.length > 0) {
    const audio = clickPool[clickPoolIndex];
    clickPoolIndex = (clickPoolIndex + 1) % clickPool.length;
    audio.currentTime = 0;
    audio.play().then(() => {
      log('playClick: html5 pool OK');
      // Session now active — try to resume AudioContext for future calls
      if (webCtx && webCtx.state === 'suspended') {
        webCtx.resume().catch(() => {});
      }
    }).catch((e: any) => log(`playClick: pool err: ${e?.message}`));
  } else {
    log('playClick: no pool, no audio!');
  }
}

export function startSpin(): void {
  if (!soundEnabled || !spinAudio || isSpinning) return;
  spinAudio.currentTime = 0;
  spinAudio.volume = 0.5;
  spinAudio.muted = false; // unmute (may have been in keepalive mode)
  if (spinAudio.paused) {
    spinAudio.play().catch(e => log(`spin start err: ${e?.message}`));
  }
  isSpinning = true;
  // Resume AudioContext while HTML5 audio session is active
  if (webCtx && webCtx.state === 'suspended') {
    webCtx.resume().catch(() => {});
  }
  log('spin started');
}

export function stopSpin(): void {
  log('stopSpin called');
  // Resume AudioContext while spin audio is still active (iOS session alive)
  if (webCtx && webCtx.state === 'suspended') {
    webCtx.resume().catch(() => {});
  }
  if (spinAudio) {
    // MUTE instead of pause: iOS releases the audio session when all HTML5
    // elements are paused, which suspends the AudioContext and kills Web Audio
    // ticks. Keeping the element playing-but-muted holds the session open.
    // iOS respects .muted (unlike .volume which is hardware-only).
    spinAudio.muted = true;
    // Don't pause — the looping muted element IS the session keepalive.
  }
  isSpinning = false;
}

export const playSound = playClick;
export const isSoundEnabled = (): boolean => soundEnabled;

export function initSoundState(): boolean {
  const savedState = localStorage.getItem('arsenal-countdown-sound');
  if (savedState === 'on') {
    soundEnabled = true;
    return true;
  }
  return false;
}
