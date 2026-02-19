/**
 * Hybrid audio handler for split-flap sound effects.
 * iOS Safari compatible — all .play() calls happen synchronously
 * within the user gesture handler, not after async awaits.
 */

let soundEnabled = false;
let audioUnlocked = false;
let isSpinning = false;

let spinAudio: HTMLAudioElement | null = null;
let clickPool: HTMLAudioElement[] = [];
let clickPoolIndex = 0;

const SOUND_PATH = '/sounds/splitflap-click.mp3';
const POOL_SIZE = 4;
const CLICK_DURATION_MS = 80;

function log(msg: string) {
  console.log(`[audio] ${msg}`);
}

function ensureElements() {
  if (clickPool.length === 0) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(SOUND_PATH);
      a.preload = 'auto';
      a.volume = 0.6;
      clickPool.push(a);
    }
  }
  if (!spinAudio) {
    spinAudio = new Audio(SOUND_PATH);
    spinAudio.preload = 'auto';
    spinAudio.loop = true;
    spinAudio.volume = 0.5;
    spinAudio.playbackRate = 1.2;
  }
}

/**
 * Must be called synchronously from a click/touch handler.
 * Plays all audio elements (muted) to unlock them on iOS,
 * then immediately starts the spin sound.
 */
export function enableAndPlay(): void {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
  ensureElements();

  log('enableAndPlay: unlocking audio elements...');

  clickPool.forEach(a => {
    a.muted = true;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      log('click element unlocked');
    }).catch(e => log(`click unlock err: ${e?.message}`));
  });

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
}

export function enableSound(): void {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
}

export function disableSound(): void {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  stopSpin();
}

export function isAudioReady(): boolean {
  return audioUnlocked;
}

export async function waitForAudio(): Promise<void> {
  return;
}

export function playClick(): void {
  if (!soundEnabled || isSpinning || !audioUnlocked) return;
  if (clickPool.length === 0) return;

  const audio = clickPool[clickPoolIndex];
  clickPoolIndex = (clickPoolIndex + 1) % clickPool.length;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, CLICK_DURATION_MS);
}

export function startSpin(): void {
  if (!soundEnabled || !spinAudio) return;
  if (isSpinning) return;

  spinAudio.currentTime = 0;
  spinAudio.volume = 0.5;
  spinAudio.play().then(() => {
    log('spin started');
  }).catch(e => log(`spin start err: ${e?.message}`));
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
