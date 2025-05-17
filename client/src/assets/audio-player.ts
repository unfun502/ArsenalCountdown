/**
 * Simple and reliable audio player for the typewriter sound effects
 */

// Track if sound is enabled
let soundEnabled = false;

// Reference to audio instance
let audioInstance: HTMLAudioElement | null = null;

// Path to audio file
const TYPEWRITER_SOUND_PATH = '/sounds/type.mp3';

/**
 * Initialize the audio player system
 */
export const initAudioPlayer = (): void => {
  // Only create the audio instance once
  if (!audioInstance) {
    audioInstance = new Audio(TYPEWRITER_SOUND_PATH);
    audioInstance.preload = 'auto';
    audioInstance.volume = 0.7;
    
    // Try to load the audio
    audioInstance.load();
    
    console.log('Audio player initialized');
    
    // Check if user had sound enabled in a previous session
    const savedSoundState = localStorage.getItem('arsenal-countdown-sound');
    if (savedSoundState === 'on') {
      soundEnabled = true;
      console.log('Sound enabled from saved preferences');
    }
  }
};

/**
 * Enable sound playback
 */
export const enableSound = (): void => {
  soundEnabled = true;
  localStorage.setItem('arsenal-countdown-sound', 'on');
  console.log('Sound enabled');
};

/**
 * Disable sound playback
 */
export const disableSound = (): void => {
  soundEnabled = false;
  localStorage.setItem('arsenal-countdown-sound', 'off');
  console.log('Sound disabled');
};

/**
 * Play the typewriter sound
 * Returns a promise that resolves when the sound starts playing,
 * or rejects if playback fails
 */
export const playTypewriterSound = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!soundEnabled) {
      // Sound is disabled, just resolve the promise
      resolve();
      return;
    }
    
    try {
      // For overlapping sounds, create a new audio element each time
      const soundInstance = new Audio(TYPEWRITER_SOUND_PATH);
      soundInstance.volume = 0.7;
      
      soundInstance.play()
        .then(() => {
          resolve();
        })
        .catch(err => {
          console.error('Error playing sound:', err);
          reject(err);
        });
    } catch (err) {
      console.error('Error creating audio:', err);
      reject(err);
    }
  });
};

/**
 * Check if sound is currently enabled
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};