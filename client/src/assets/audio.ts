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
  log(`click pool created with ${POOL_SIZE} elements`);
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
    if (!AC) {
      log('No AudioContext available');
      return;
    }
    webCtx = new AC();
    log(`AudioContext created, state=${webCtx.state}`);
    if (webCtx.state === 'suspended') {
      await webCtx.resume();
      log(`AudioContext resumed, state=${webCtx.state}`);
    }

    const silent = webCtx.createBuffer(1, 1, 22050);
    const node = webCtx.createBufferSource();
    node.buffer = silent;
    node.connect(webCtx.destination);
    node.start(0);

    const response = await fetch(TICK_PATH);
    if (!response.ok) {
      log(`Failed to fetch tick: ${response.status}`);
      return;
    }
    const arrayBuf = await response.arrayBuffer();
    log(`Tick file fetched: ${arrayBuf.byteLength} bytes`);
    clickBuffer = await webCtx.decodeAudioData(arrayBuf);
    const channelData = clickBuffer.getChannelData(0);
    let maxAmp = 0;
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    log(`Tick decoded: duration=${clickBuffer.duration}s, channels=${clickBuffer.numberOfChannels}, sampleRate=${clickBuffer.sampleRate}, maxAmplitude=${maxAmp.toFixed(4)}`);
    webAudioReady = true;
    log('Web Audio ready');

    startKeepalive();
  } catch (e: any) {
    log(`Web Audio init failed: ${e?.message}`);
    webAudioReady = false;
  }
}

export function enableAndPlay(): void {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');

  createSpinAudio();
  createClickPool();

  let unlockCount = 0;
  for (const a of clickPool) {
    a.muted = true;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      unlockCount++;
      log(`pool element unlocked (${unlockCount}/${POOL_SIZE})`);
    }).catch(e => log(`pool unlock failed: ${e?.message}`));
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

let tickPlayCount = 0;

export function playClick(): void {
  if (!soundEnabled || isSpinning) return;

  tickPlayCount++;
  const logEvery = tickPlayCount <= 5 || tickPlayCount % 10 === 0;

  if (webAudioReady && webCtx && clickBuffer) {
    if (webCtx.state === 'suspended') {
      webCtx.resume().catch(() => {});
    }
    try {
      const source = webCtx.createBufferSource();
      source.buffer = clickBuffer;
      const gain = webCtx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(webCtx.destination);
      source.start(0);
      if (logEvery) log(`tick #${tickPlayCount} via WebAudio (ctxState=${webCtx.state})`);
    } catch (e: any) {
      log(`Web Audio play error: ${e?.message}`);
    }
    return;
  }

  if (clickPool.length > 0) {
    const audio = clickPool[clickPoolIndex];
    clickPoolIndex = (clickPoolIndex + 1) % clickPool.length;
    audio.currentTime = 0;
    audio.play().catch(e => log(`pool play err: ${e?.message}`));
    if (logEvery) log(`tick #${tickPlayCount} via HTML5 pool`);
    return;
  }

  log('no audio backend available');
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
