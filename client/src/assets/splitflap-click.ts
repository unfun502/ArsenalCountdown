// Sound utility for the split flap animation
let flipAudio: HTMLAudioElement | null = null;
let soundEnabled = false;

// Initialize the sound system with our specific sound
export const initSplitFlapSound = (): void => {
  if (!flipAudio) {
    flipAudio = new Audio('/sounds/splitflap-click.mp3');
    flipAudio.volume = 0.3; // Lower volume to avoid it being too loud
    flipAudio.preload = 'auto'; // Preload for better performance
  }
};

// Enable sound globally - called after user interaction
export const enableSound = (): void => {
  soundEnabled = true;
  initSplitFlapSound();
};

// Play the flip sound with proper handling for quick successive plays
export const playSplitFlapSound = (): void => {
  if (!soundEnabled) return;
  
  try {
    if (!flipAudio) {
      initSplitFlapSound();
    }
    
    // Clone the audio for concurrent sounds (multiple digits flipping)
    const audioClone = flipAudio?.cloneNode() as HTMLAudioElement;
    if (audioClone) {
      audioClone.volume = 0.3;
      audioClone.play().catch(e => {
        console.log("Browser prevented autoplay:", e);
      });
    }
  } catch (err) {
    console.error("Error playing sound:", err);
  }
};

// Stop all sounds
export const stopSplitFlapSound = (): void => {
  try {
    if (flipAudio) {
      flipAudio.pause();
      flipAudio.currentTime = 0;
    }
  } catch (err) {
    console.error("Error stopping sound:", err);
  }
};

// Check if sound is enabled
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};