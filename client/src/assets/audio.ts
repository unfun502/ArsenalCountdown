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
let lastTickSource: AudioBufferSourceNode | null = null;

let keepaliveOsc: OscillatorNode | null = null;
let keepaliveGain: GainNode | null = null;

const SPIN_PATH = '/sounds/splitflap-click.mp3';
const TICK_PATH = '/sounds/splitflap-tick.mp3';
const POOL_SIZE = 4;

// iPadOS 13+ reports as MacIntel but has touch points
const IS_IOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

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

  // iOS 16.4+: declare a playback session so Web Audio output is not silenced
  // by the ringer/silent switch and survives better across interruptions.
  try {
    const session = (navigator as any).audioSession;
    if (session) session.type = 'playback';
  } catch {}

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
      // iOS moves the context to 'interrupted' (a state this code never
      // checked for) when the media session changes; claw back automatically.
      webCtx.onstatechange = () => {
        if (soundEnabled && webCtx && webCtx.state !== 'running') {
          webCtx.resume().catch(() => {});
        }
      };
    }
  } else if (webCtx.state !== 'running') {
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

  const playViaWebAudio = (): boolean => {
    if (!(webAudioReady && webCtx && clickBuffer && webCtx.state === 'running')) return false;
    try {
      const source = webCtx.createBufferSource();
      source.buffer = clickBuffer;
      const gain = webCtx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(webCtx.destination);
      source.start(0);
      lastTickSource = source;
      source.onended = () => {
        if (lastTickSource === source) lastTickSource = null;
      };
      log('playClick: web audio OK');
      return true;
    } catch (e: any) {
      log(`playClick: web audio err: ${e?.message}`);
      return false;
    }
  };

  const playViaPool = (): boolean => {
    if (clickPool.length === 0) return false;
    const audio = clickPool[clickPoolIndex];
    clickPoolIndex = (clickPoolIndex + 1) % clickPool.length;
    audio.currentTime = 0;
    audio.play().then(() => {
      log('playClick: html5 pool OK');
      // Session now active — try to resume AudioContext for future calls
      if (webCtx && webCtx.state !== 'running') {
        webCtx.resume().catch(() => {});
      }
    }).catch((e: any) => log(`playClick: pool err: ${e?.message}`));
    return true;
  };

  // iOS: prefer the gesture-unlocked HTML5 pool. iOS tears down or zombifies
  // the AudioContext once the audible media session ends (the context can even
  // report 'running' while producing no output), which is why Web Audio ticks
  // died after the first one. Replaying an already-unlocked HTML5 element from
  // a timer is the one path iOS reliably keeps working.
  if (IS_IOS) {
    if (!playViaPool()) playViaWebAudio();
    return;
  }

  if (!playViaWebAudio() && !playViaPool()) {
    log('playClick: no pool, no audio!');
  }
}

export function startSpin(): void {
  if (!soundEnabled || !spinAudio || isSpinning) return;
  // Cut any still-ringing tick so it never overlaps the spin sound
  if (lastTickSource) {
    try { lastTickSource.stop(); } catch {}
    lastTickSource = null;
  }
  for (const a of clickPool) {
    if (!a.paused) {
      a.pause();
      a.currentTime = 0;
    }
  }
  spinAudio.currentTime = 0;
  spinAudio.volume = 0.5;
  spinAudio.muted = false; // unmute (may have been in keepalive mode)
  if (spinAudio.paused) {
    spinAudio.play().catch(e => log(`spin start err: ${e?.message}`));
  }
  isSpinning = true;
  // Resume AudioContext while HTML5 audio session is active
  if (webCtx && webCtx.state !== 'running') {
    webCtx.resume().catch(() => {});
  }
  log('spin started');
}

export function stopSpin(): void {
  log('stopSpin called');
  // Resume AudioContext while spin audio is still active (session alive)
  if (webCtx && webCtx.state !== 'running') {
    webCtx.resume().catch(() => {});
  }
  if (spinAudio) {
    if (IS_IOS) {
      // Pause outright on iOS. The old muted-loop keepalive backfired there:
      // a muted-only element doesn't hold the audio session, iOS tears it
      // down anyway, and ticks now come from the HTML5 pool which doesn't
      // need a live session.
      spinAudio.pause();
      spinAudio.currentTime = 0;
    } else {
      // MUTE instead of pause on desktop: keeping the element playing-but-
      // muted prevents browsers from suspending the "silent" audio graph
      // between Web Audio ticks.
      spinAudio.muted = true;
    }
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
