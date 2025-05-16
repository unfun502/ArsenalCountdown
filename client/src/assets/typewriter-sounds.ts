// Audio management for split flap typewriter sounds

// Cache for the audio instances
let clickSound: HTMLAudioElement | null = null;
let keySound: HTMLAudioElement | null = null;

// Flag to track if sound is enabled
let soundEnabled = false;

/**
 * Initialize the audio elements once
 */
export const initTypewriterSounds = (): void => {
  // Only initialize once
  if (clickSound === null && keySound === null) {
    try {
      // Create audio elements
      clickSound = new Audio('/sounds/typewriter-click.mp3');
      keySound = new Audio('/sounds/typewriter-key.mp3');
      
      // Configure audio elements
      if (clickSound) {
        clickSound.preload = 'auto';
        clickSound.volume = 0.5;
      }
      
      if (keySound) {
        keySound.preload = 'auto';
        keySound.volume = 0.3;
      }
      
      console.log('Typewriter sounds initialized successfully');
    } catch (error) {
      console.error('Failed to initialize typewriter sounds:', error);
    }
  }
};

/**
 * Enable sound playback
 */
export const enableSound = (): void => {
  soundEnabled = true;
  console.log('Typewriter sounds enabled');
};

/**
 * Disable sound playback
 */
export const disableSound = (): void => {
  soundEnabled = false;
  console.log('Typewriter sounds disabled');
};

/**
 * Play the main typewriter click sound
 */
export const playTypewriterClickSound = (): void => {
  if (!soundEnabled) return;
  
  try {
    // Make sure sounds are initialized
    if (!clickSound) {
      initTypewriterSounds();
    }
    
    // Play the sound
    if (clickSound) {
      // Create a clone to allow overlapping sounds
      const soundClone = clickSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.5;
      soundClone.play().catch(error => {
        console.error('Error playing typewriter click sound:', error);
      });
    }
  } catch (error) {
    console.error('Error playing typewriter click sound:', error);
  }
};

/**
 * Play the individual key click sound
 */
export const playTypewriterKeySound = (): void => {
  if (!soundEnabled) return;
  
  try {
    // Make sure sounds are initialized
    if (!keySound) {
      initTypewriterSounds();
    }
    
    // Play the sound
    if (keySound) {
      // Create a clone to allow overlapping sounds
      const soundClone = keySound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
        console.error('Error playing typewriter key sound:', error);
      });
    }
  } catch (error) {
    console.error('Error playing typewriter key sound:', error);
  }
};

/**
 * Check if sound is enabled
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};