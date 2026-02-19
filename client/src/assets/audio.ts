/**
 * Hybrid audio handler for split-flap sound effects.
 * iOS Safari compatible:
 * - HTML5 Audio for initial unlock + spin loop
 * - Web Audio API for per-second clicks (more reliable on iOS after unlock)
 * - Silent keepalive loop to prevent iOS from suspending audio session
 */

let soundEnabled = false;
let audioUnlocked = false;
let isSpinning = false;

let spinAudio: HTMLAudioElement | null = null;
let keepaliveAudio: HTMLAudioElement | null = null;
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

let webCtx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let webAudioReady = false;

const SOUND_PATH = '/sounds/splitflap-click.mp3';
const CLICK_DURATION = 0.08;

function log(msg: string) {
  console.log(`[audio] ${msg}`);
}

function createSpinAudio() {
  if (spinAudio) return;
  spinAudio = new Audio(SOUND_PATH);
  spinAudio.preload = 'auto';
  spinAudio.loop = true;
  spinAudio.volume = 0.5;
  spinAudio.playbackRate = 1.2;
}

function startKeepalive() {
  if (keepaliveInterval) return;
  if (!keepaliveAudio) {
    keepaliveAudio = new Audio(SOUND_PATH);
    keepaliveAudio.preload = 'auto';
    keepaliveAudio.loop = true;
    keepaliveAudio.volume = 0.001;
  }
  keepaliveAudio.play().catch(() => {});
  keepaliveInterval = setInterval(() => {
    if (keepaliveAudio && keepaliveAudio.paused && soundEnabled) {
      keepaliveAudio.play().catch(() => {});
    }
  }, 5000);
  log('keepalive started');
}

function stopKeepalive() {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
  if (keepaliveAudio) {
    keepaliveAudio.pause();
    keepaliveAudio.currentTime = 0;
  }
}

async function initWebAudio() {
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
    
    const response = await fetch(SOUND_PATH);
    const arrayBuf = await response.arrayBuffer();
    const fullBuffer = await webCtx.decodeAudioData(arrayBuf);
    
    const clickSamples = Math.floor(CLICK_DURATION * fullBuffer.sampleRate);
    clickBuffer = webCtx.createBuffer(fullBuffer.numberOfChannels, clickSamples, fullBuffer.sampleRate);
    for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
      const src = fullBuffer.getChannelData(ch);
      const dst = clickBuffer.getChannelData(ch);
      for (let i = 0; i < clickSamples; i++) dst[i] = src[i];
    }
    webAudioReady = true;
    log('Web Audio ready');
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
  
  if (spinAudio) {
    spinAudio.muted = false;
    spinAudio.currentTime = 0;
    spinAudio.volume = 0.5;
    spinAudio.play().then(() => {
      log('spin playing');
    }).catch(e => log(`spin play err: ${e?.message}`));
    isSpinning = true;
  }

  startKeepalive();
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
  
  if (webAudioReady && webCtx && clickBuffer) {
    if (webCtx.state === 'suspended') webCtx.resume();
    const source = webCtx.createBufferSource();
    source.buffer = clickBuffer;
    const gain = webCtx.createGain();
    gain.gain.value = 0.6;
    source.connect(gain);
    gain.connect(webCtx.destination);
    source.start(0);
    return;
  }
  
  log('Web Audio not ready for click, skipping');
}

export function startSpin(): void {
  if (!soundEnabled || !spinAudio || isSpinning) return;
  spinAudio.currentTime = 0;
  spinAudio.volume = 0.5;
  spinAudio.play().catch(e => log(`spin start err: ${e?.message}`));
  isSpinning = true;
}

export function stopSpin(): void {
  if (spinAudio) {
    spinAudio.pause();
    spinAudio.currentTime = 0;
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
