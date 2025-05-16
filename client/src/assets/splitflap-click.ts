// A simplified sound utility for the split flap animation
let audio: HTMLAudioElement | null = null;

export const initSplitFlapSound = (): void => {
  if (!audio) {
    audio = new Audio('/split-flap.wav');
    audio.volume = 0.6;
    audio.loop = true;
  }
};

export const playSplitFlapSound = (): void => {
  try {
    if (!audio) {
      initSplitFlapSound();
    }
    
    if (audio) {
      audio.play().catch(e => {
        console.log("Browser prevented autoplay:", e);
      });
    }
  } catch (err) {
    console.error("Error playing sound:", err);
  }
};

export const stopSplitFlapSound = (): void => {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch (err) {
    console.error("Error stopping sound:", err);
  }
};