/**
 * Hybrid audio handler for split-flap sound effects.
 * iOS Safari compatible:
 * - HTML5 Audio for spin loop (started synchronously in user gesture)
 * - Web Audio API for per-second clicks (initialized async after unlock)
 * - HTML5 Audio click pool as fallback if Web Audio not ready
 * - Silent Web Audio oscillator keepalive to prevent iOS audio session suspend
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
const CLICK_DURATION = 0.12;
const POOL_SIZE = 3;

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
    a.volume = 0.6;
    clickPool.push(a);
  }
}

function startKeepalive() {
  if (!webCtx || keepaliveOsc) return;
  try {
    keepaliveOsc = webCtx.createOscillator();
    keepaliveGain = webCtx.createGain();
    keepaliveGain.gain.value = 0;
    keepaliveOsc.connect(keepaliveGain);
    keepaliveGain.connect(webCtx.destination);
    keepaliveOsc.start(0);
    log('silent keepalive oscillator started');
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
    webCtx = new AC();
    if (webCtx.state === 'suspended') await webCtx.resume();

    const silent = webCtx.createBuffer(1, 1, 22050);
    const node = webCtx.createBufferSource();
    node.buffer = silent;
    node.connect(webCtx.destination);
    node.start(0);

    const response = await fetch(TICK_PATH);
    const arrayBuf = await response.arrayBuffer();
    clickBuffer = await webCtx.decodeAudioData(arrayBuf);
    webAudioReady = true;
    log('Web Audio ready for clicks');

    startKeepalive();
  } catch (e: any) {
    log(`Web Audio init failed: ${e?.message}`);
    webAudioReady = false;
  }
}

/**
 * Must be called synchronously from a click/touch handler.
 * Unlocks audio on iOS, starts spin sound immediately.
 */
export function enableAndPlay(): void {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');

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
  stopSpin();
  stopKeepalive();
}

export function isAudioReady(): boolean {
  return audioUnlocked;
}

export async function waitForAudio(): Promise<void> {
  return;
}

export function playClick(): void {
  if (!soundEnabled || isSpinning) return;

  // Simple direct playback - create fresh Audio each time
  try {
    const a = new Audio(TICK_PATH);
    a.volume = 0.7;
    a.play().catch(() => {});
  } catch {}
}

export function startSpin(): void {
  if (!soundEnabled || !spinAudio || isSpinning) return;
  spinAudio.currentTime = 0;
  spinAudio.volume = 0.5;
  spinAudio.play().catch(e => log(`spin start err: ${e?.message}`));
  isSpinning = true;
  log('spin started');
}

export function stopSpin(): void {
  log('stopSpin called');
  if (spinAudio) {
    spinAudio.pause();
    spinAudio.currentTime = 0;
    log('spin audio paused');
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
