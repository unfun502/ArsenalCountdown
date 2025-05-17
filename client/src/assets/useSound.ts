// Simple sound hook for typewriter sound effects

// Track if sound is enabled
let soundEnabled = false;

// Audio URL
const SOUND_URL = '/sounds/typewriter.mp3';

// Cache for audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Initialize the sound cache
 */
export const initSound = (): void => {
  // Preload the audio
  if (!audioCache[SOUND_URL]) {
    const audio = new Audio(SOUND_URL);
    audio.load(); // Start loading
    audioCache[SOUND_URL] = audio;
  }
};

/**
 * Enable sound playback
 */
export const enableSound = (): void => {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
};

/**
 * Disable sound playback
 */
export const disableSound = (): void => {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
};

/**
 * Play the sound
 */
export const playSound = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!soundEnabled) {
      resolve();
      return;
    }

    try {
      // Always create a fresh audio element for each play to avoid
      // issues with browsers blocking multiple plays of the same element
      const sound = new Audio(SOUND_URL);
      sound.volume = 0.7;
      
      // Play the sound
      sound.play()
        .then(() => {
          resolve();
        })
        .catch((error) => {
          console.error('Error playing sound:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error creating audio:', error);
      reject(error);
    }
  });
};

/**
 * Check if sound is currently enabled
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

/**
 * Load sound state from localStorage
 */
export const loadSoundState = (): boolean => {
  const savedState = localStorage.getItem('arsenal-countdown-sound');
  if (savedState === 'on') {
    soundEnabled = true;
    return true;
  }
  return false;
};