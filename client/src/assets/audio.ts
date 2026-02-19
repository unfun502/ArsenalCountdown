/**
 * Web Audio API handler for split-flap sound effects
 * iOS Safari compatible: context created + resumed + silent buffer played
 * all within the user's tap event to unlock audio.
 */

let soundEnabled = false;
let audioContext: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let fullBuffer: AudioBuffer | null = null;
let spinSource: AudioBufferSourceNode | null = null;
let spinGain: GainNode | null = null;
let isSpinning = false;
let audioReady = false;

const SOUND_PATH = '/sounds/splitflap-click.mp3';
const CLICK_DURATION = 0.08;

const unlockAndLoad = async (): Promise<void> => {
  if (audioReady) return;

  if (!audioContext) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    audioContext = new AC();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const silent = audioContext.createBuffer(1, 1, 22050);
  const src = audioContext.createBufferSource();
  src.buffer = silent;
  src.connect(audioContext.destination);
  src.start();

  if (!fullBuffer) {
    try {
      const response = await fetch(SOUND_PATH);
      const arrayBuffer = await response.arrayBuffer();
      fullBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const clickSamples = Math.floor(CLICK_DURATION * fullBuffer.sampleRate);
      clickBuffer = audioContext.createBuffer(
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
    } catch {
      return;
    }
  }

  audioReady = true;
};

const ensureResumed = async (): Promise<boolean> => {
  if (!audioContext) return false;
  if (audioContext.state === 'suspended') {
    try { await audioContext.resume(); } catch { return false; }
  }
  return audioContext.state === 'running';
};

export const enableSound = (): void => {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
  unlockAndLoad();
};

export const disableSound = (): void => {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  stopSpin();
};

export const playClick = (): void => {
  if (!soundEnabled || isSpinning || !audioReady) return;
  if (!audioContext || !clickBuffer) return;

  ensureResumed();

  const source = audioContext.createBufferSource();
  source.buffer = clickBuffer;
  const gain = audioContext.createGain();
  gain.gain.value = 0.6;
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start();
};

export const startSpin = (): void => {
  if (!soundEnabled || !audioReady) return;
  if (!audioContext || !fullBuffer) return;

  ensureResumed();
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
  spinSource.start();
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
    unlockAndLoad();
    return true;
  }
  return false;
};
