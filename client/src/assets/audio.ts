/**
 * Web Audio API handler for split-flap sound effects
 * iOS Safari compatible.
 * 
 * Strategy:
 * 1. Pre-fetch audio file as ArrayBuffer on page load (no gesture needed)
 * 2. On user tap: create AudioContext, resume, play silent buffer, decode
 * 3. Spin/click play from decoded buffers
 */

let soundEnabled = false;
let audioContext: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let fullBuffer: AudioBuffer | null = null;
let spinSource: AudioBufferSourceNode | null = null;
let spinGain: GainNode | null = null;
let isSpinning = false;
let audioReady = false;
let prefetchedData: ArrayBuffer | null = null;
let unlockPromise: Promise<void> | null = null;

const SOUND_PATH = '/sounds/splitflap-click.mp3';
const CLICK_DURATION = 0.08;

const prefetch = async (): Promise<void> => {
  if (prefetchedData) return;
  try {
    const response = await fetch(SOUND_PATH);
    prefetchedData = await response.arrayBuffer();
  } catch {
    // will retry on enable
  }
};

prefetch();

const createContext = (): AudioContext | null => {
  if (audioContext) return audioContext;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    audioContext = new AC();
    return audioContext;
  } catch {
    return null;
  }
};

const unlock = async (): Promise<void> => {
  const ctx = createContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const silent = ctx.createBuffer(1, 1, 22050);
  const node = ctx.createBufferSource();
  node.buffer = silent;
  node.connect(ctx.destination);
  node.start(0);

  if (!prefetchedData) {
    await prefetch();
  }

  if (prefetchedData && !fullBuffer) {
    const copy = prefetchedData.slice(0);
    fullBuffer = await ctx.decodeAudioData(copy);

    const clickSamples = Math.floor(CLICK_DURATION * fullBuffer.sampleRate);
    clickBuffer = ctx.createBuffer(
      fullBuffer.numberOfChannels,
      clickSamples,
      fullBuffer.sampleRate
    );
    for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
      const srcData = fullBuffer.getChannelData(ch);
      const dst = clickBuffer.getChannelData(ch);
      for (let i = 0; i < clickSamples; i++) {
        dst[i] = srcData[i];
      }
    }
  }

  audioReady = !!(fullBuffer && clickBuffer);
};

export const enableSound = (): void => {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
  unlockPromise = unlock();
};

export const isAudioReady = (): boolean => audioReady;

export const waitForAudio = async (): Promise<void> => {
  if (unlockPromise) await unlockPromise;
};

export const disableSound = (): void => {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  stopSpin();
};

export const playClick = (): void => {
  if (!soundEnabled || isSpinning || !audioReady) return;
  if (!audioContext || !clickBuffer) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  source.buffer = clickBuffer;
  const gain = audioContext.createGain();
  gain.gain.value = 0.6;
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start(0);
};

export const startSpin = (): void => {
  if (!soundEnabled || !audioReady) return;
  if (!audioContext || !fullBuffer) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  stopSpin();

  spinSource = audioContext.createBufferSource();
  spinSource.buffer = fullBuffer;
  spinSource.loop = true;
  spinSource.playbackRate.value = 1.2;
  spinGain = audioContext.createGain();
  spinGain.gain.setValueAtTime(0, audioContext.currentTime);
  spinGain.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.3);
  spinSource.connect(spinGain);
  spinGain.connect(audioContext.destination);
  spinSource.start(0);
  isSpinning = true;
};

export const stopSpin = (): void => {
  if (spinSource && spinGain) {
    if (audioContext) {
      spinGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
      const src = spinSource;
      setTimeout(() => {
        try { src.stop(); } catch {}
        src.disconnect();
      }, 200);
    } else {
      try { spinSource.stop(); } catch {}
      spinSource.disconnect();
    }
    spinSource = null;
    spinGain = null;
  }
  isSpinning = false;
};

export const playSound = playClick;

export const isSoundEnabled = (): boolean => soundEnabled;

export const initSoundState = (): boolean => {
  const savedState = localStorage.getItem('arsenal-countdown-sound');
  if (savedState === 'on') {
    soundEnabled = true;
    unlockPromise = unlock();
    return true;
  }
  return false;
};
