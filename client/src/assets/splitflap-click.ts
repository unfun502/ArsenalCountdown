// Sound utility for the split flap animation
let flipAudio: HTMLAudioElement | null = null;
let soundEnabled = false;

// Initialize the sound system with our specific sound
export const initSplitFlapSound = (): void => {
  if (!flipAudio) {
    console.log("Initializing split-flap sound effect");
    // Use the originally provided sound (flipcard.mp3)
    flipAudio = new Audio('/sounds/flipcard.mp3');
    flipAudio.volume = 0.3; // Lower volume to avoid it being too loud
    flipAudio.preload = 'auto'; // Preload for better performance
  }
};

// Enable sound globally - called after user interaction
export const enableSound = (): void => {
  console.log("Sound system enabled");
  soundEnabled = true;
  
  // Initialize sound system
  initSplitFlapSound();
  
  // Test play to confirm it works
  if (flipAudio) {
    console.log("Testing sound playback...");
    // Create a clone to avoid issues with the original audio element
    const testAudio = flipAudio.cloneNode() as HTMLAudioElement;
    testAudio.volume = 0.5;
    testAudio.play()
      .then(() => console.log("✓ Sound test successful"))
      .catch(e => console.error("✗ Sound test failed:", e));
  }
};

// Play the flip sound with proper handling for quick successive plays
export const playSplitFlapSound = (): void => {
  if (!soundEnabled) {
    console.log("Sound is disabled, not playing");
    return;
  }
  
  console.log("Attempting to play split-flap sound");
  
  try {
    if (!flipAudio) {
      console.log("No audio initialized, initializing now");
      initSplitFlapSound();
    }
    
    // Clone the audio for concurrent sounds (multiple digits flipping)
    const audioClone = flipAudio?.cloneNode() as HTMLAudioElement;
    if (audioClone) {
      audioClone.volume = 0.5; // Increased volume for better audibility
      console.log("Playing sound clone");
      audioClone.play()
        .then(() => console.log("Sound played successfully"))
        .catch(e => {
          console.error("Browser prevented autoplay:", e);
          // Try to play the original audio as a fallback
          if (flipAudio) {
            console.log("Trying original audio element");
            flipAudio.play().catch(e => console.error("Original audio also failed:", e));
          }
        });
    } else {
      console.error("Failed to clone audio node");
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