// A simple function to play the split flap sound
export const playSplitFlapSound = () => {
  try {
    const audio = document.getElementById('clickSound');
    if (audio) {
      // Reset audio position
      audio.currentTime = 0;
      
      // Set volume
      audio.volume = 0.5;
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle potential errors with autoplay
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log("Audio play error (browser may require user interaction):", e);
        });
      }
    }
  } catch (err) {
    console.error("Error playing split flap sound:", err);
  }
};

// Stop the sound
export const stopSplitFlapSound = () => {
  try {
    const audio = document.getElementById('clickSound');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch (err) {
    console.error("Error stopping split flap sound:", err);
  }
};