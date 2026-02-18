/**
 * Audio handler for split-flap sound effects using an audio pool
 */

let soundEnabled = false;

const SOUND_PATH = '/sounds/splitflap-click.mp3';
const POOL_SIZE = 5;
let audioPool: HTMLAudioElement[] = [];
let poolIndex = 0;
let poolReady = false;

const initPool = (): void => {
  if (poolReady) return;
  audioPool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const audio = new Audio(SOUND_PATH);
    audio.volume = 0.5;
    audio.preload = 'auto';
    audioPool.push(audio);
  }
  poolReady = true;
};

export const enableSound = (): void => {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
  initPool();
};

export const disableSound = (): void => {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  audioPool.forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
};

export const playSound = (): void => {
  if (!soundEnabled || !poolReady) return;

  const audio = audioPool[poolIndex];
  poolIndex = (poolIndex + 1) % POOL_SIZE;

  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

export const initSoundState = (): boolean => {
  const savedState = localStorage.getItem('arsenal-countdown-sound');
  if (savedState === 'on') {
    soundEnabled = true;
    initPool();
    return true;
  }
  return false;
};
