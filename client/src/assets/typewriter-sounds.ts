// Audio management for split flap typewriter sounds

// Cache for the audio instances and audio URLs for fallback
const CLICK_SOUND_PATHS = [
  '/sounds/type.mp3',
  '/sounds/typewriter-click.wav',
  '/sounds/typewriter-click.mp3'
];

const KEY_SOUND_PATHS = [
  '/sounds/type.mp3',
  '/sounds/typewriter-key.mp3' 
];

// Cache for the audio instances
let clickSound: HTMLAudioElement | null = null;
let keySound: HTMLAudioElement | null = null;

// Flag to track if sound is enabled
let soundEnabled = false;

/**
 * Try loading an audio file from multiple possible paths
 * This helps work around browser compatibility issues
 */
const tryLoadAudio = (paths: string[]): HTMLAudioElement => {
  const audio = new Audio();
  
  // Try each path until one works
  for (const path of paths) {
    try {
      audio.src = path;
      return audio;
    } catch (e) {
      console.warn(`Failed to load audio from ${path}, trying next source`);
    }
  }
  
  // If all paths failed, use the first one anyway
  audio.src = paths[0];
  return audio;
};

/**
 * Initialize the audio elements once
 */
export const initTypewriterSounds = (): void => {
  // Only initialize once
  if (clickSound === null && keySound === null) {
    try {
      // Create audio elements with fallbacks
      clickSound = tryLoadAudio(CLICK_SOUND_PATHS);
      keySound = tryLoadAudio(KEY_SOUND_PATHS);
      
      // Configure audio elements
      if (clickSound) {
        clickSound.preload = 'auto';
        clickSound.volume = 0.7;
      }
      
      if (keySound) {
        keySound.preload = 'auto';
        keySound.volume = 0.5;
      }
      
      // Attempt to play a silent sound to unblock audio on iOS
      document.addEventListener('click', function unlockAudio() {
        const silentSound = new Audio("data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==");
        silentSound.play().catch(e => console.error("Silent sound play failed:", e));
        document.removeEventListener('click', unlockAudio);
      }, { once: true });
      
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
  
  // Ensure sounds are initialized
  initTypewriterSounds();
  
  // Try to play a sound immediately to ensure audio context is started
  setTimeout(() => {
    try {
      if (clickSound) {
        // On iOS, we need a user gesture to start audio
        // This will be triggered by the click on the sound button
        const tempSound = clickSound.cloneNode() as HTMLAudioElement;
        tempSound.volume = 0.1;
        tempSound.play()
          .then(() => console.log("Audio system working"))
          .catch(e => console.error("Initial sound play failed:", e));
      }
    } catch (e) {
      console.error("Failed to play initial sound:", e);
    }
  }, 100);
};

/**
 * Disable sound playback
 */
export const disableSound = (): void => {
  soundEnabled = false;
  console.log('Typewriter sounds disabled');
};

/**
 * Simple function to play any sound with error handling
 */
const playSound = (sound: HTMLAudioElement | null, volume: number = 0.7): void => {
  if (!soundEnabled || !sound) return;
  
  try {
    // Create a clone to allow overlapping sounds
    const soundClone = sound.cloneNode() as HTMLAudioElement;
    soundClone.volume = volume;
    
    // Play with both promise handling and traditional error handling
    const playPromise = soundClone.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing sound (promise):', error);
      });
    }
  } catch (error) {
    console.error('Error playing sound (traditional):', error);
  }
};

/**
 * Play the main typewriter click sound
 */
export const playTypewriterClickSound = (): void => {
  if (!soundEnabled) return;
  
  // Initialize if needed
  if (!clickSound) {
    initTypewriterSounds();
  }
  
  // Play the sound
  playSound(clickSound, 0.7);
};

/**
 * Play the individual key click sound
 */
export const playTypewriterKeySound = (): void => {
  if (!soundEnabled) return;
  
  // Initialize if needed
  if (!keySound) {
    initTypewriterSounds();
  }
  
  // Play the sound
  playSound(keySound, 0.5);
};

/**
 * Check if sound is enabled
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};