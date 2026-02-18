/**
 * Web Audio API handler for split-flap sound effects
 * 
 * Two modes:
 * 1. Rapid clicking loop during board spin animation
 * 2. Single short click on each second tick
 */

let soundEnabled = false;
let audioContext: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let fullBuffer: AudioBuffer | null = null;
let spinSource: AudioBufferSourceNode | null = null;
let isSpinning = false;

const SOUND_PATH = '/sounds/splitflap-click.mp3';
const CLICK_DURATION = 0.08;

const getContext = (): AudioContext | null => {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const loadAudio = async (): Promise<void> => {
  const ctx = getContext();
  if (!ctx || fullBuffer) return;

  try {
    const response = await fetch(SOUND_PATH);
    const arrayBuffer = await response.arrayBuffer();
    fullBuffer = await ctx.decodeAudioData(arrayBuffer);

    const clickSamples = Math.floor(CLICK_DURATION * fullBuffer.sampleRate);
    clickBuffer = ctx.createBuffer(
      fullBuffer.numberOfChannels,
      clickSamples,
      fullBuffer.sampleRate
    );
    for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
      const src = fullBuffer.getChannelData(ch);
      const dst = clickBuffer.getChannelData(ch);
      for (let i = 0; i < clickSamples; i++) {
        dst[i] = src[i];
      }
    }
  } catch {
    // silently fail
  }
};

export const enableSound = (): void => {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
  loadAudio();
};

export const disableSound = (): void => {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  stopSpin();
};

export const playClick = (): void => {
  if (!soundEnabled || isSpinning) return;
  const ctx = getContext();
  if (!ctx || !clickBuffer) return;

  const source = ctx.createBufferSource();
  source.buffer = clickBuffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
};

export const startSpin = (): void => {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx || !fullBuffer) return;

  stopSpin();

  spinSource = ctx.createBufferSource();
  spinSource.buffer = fullBuffer;
  spinSource.loop = true;
  spinSource.playbackRate.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  spinSource.connect(gain);
  gain.connect(ctx.destination);
  spinSource.start();
  isSpinning = true;
};

export const stopSpin = (): void => {
  if (spinSource) {
    try {
      spinSource.stop();
    } catch {
      // already stopped
    }
    spinSource.disconnect();
    spinSource = null;
  }
  isSpinning = false;
};

export const playSound = playClick;

export const isSoundEnabled = (): boolean => soundEnabled;

export const initSoundState = (): boolean => {
  const savedState = localStorage.getItem('arsenal-countdown-sound');
  if (savedState === 'on') {
    soundEnabled = true;
    loadAudio();
    return true;
  }
  return false;
};
