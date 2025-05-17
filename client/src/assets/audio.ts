/**
 * Simple audio handler for typewriter sound effects
 */

// Track if sound is enabled
let soundEnabled = false;

// Audio path
const SOUND_PATH = '/sounds/type.mp3';

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
 */
export const playSound = (): void => {
  if (!soundEnabled) return;
  
  try {
    // Create a new audio element each time
    const audio = new Audio(SOUND_PATH);
    audio.volume = 0.7;
    
    // Attempt to play the sound
    audio.play()
      .then(() => {
        console.log('Sound played successfully');
      })
      .catch((err) => {
        console.error('Error playing sound:', err);
      });
  } catch (err) {
    console.error('Error creating audio:', err);
  }
};

/**
 * Check if sound is enabled
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

/**
 * Initialize sound state from localStorage
 */
export const initSoundState = (): boolean => {
  const savedState = localStorage.getItem('arsenal-countdown-sound');
  if (savedState === 'on') {
    soundEnabled = true;
    return true;
  }
  return false;
};