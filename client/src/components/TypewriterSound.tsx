import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

// This is a simple component to manage typewriter sound for the application
export function TypewriterSound() {
  const [isEnabled, setIsEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio on component mount
  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/sounds/typewriter.mp3');
    
    if (audioRef.current) {
      // Set properties
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.7;
      
      // Load the audio
      audioRef.current.load();
    }
    
    // Check if sound was previously enabled
    const savedState = localStorage.getItem('arsenal-sound-enabled');
    if (savedState === 'true') {
      setIsEnabled(true);
    }
    
    // Expose sound play function to window for other components to use
    window.playTypewriterSound = () => {
      if (isEnabled && audioRef.current) {
        // Create a new audio element for each play to avoid blocking
        const sound = new Audio('/sounds/typewriter.mp3');
        sound.volume = 0.7;
        sound.play().catch(e => console.error('Error playing sound:', e));
      }
    };
    
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Remove global function
      delete (window as any).playTypewriterSound;
    };
  }, [isEnabled]);
  
  // Toggle sound on/off
  const toggleSound = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Save preference
    localStorage.setItem('arsenal-sound-enabled', newState ? 'true' : 'false');
    
    // Play demo sound if enabling
    if (newState && audioRef.current) {
      try {
        const demoSound = new Audio('/sounds/typewriter.mp3');
        demoSound.volume = 0.7;
        demoSound.play()
          .then(() => console.log('Sound demo played successfully'))
          .catch(e => console.error('Error playing demo sound:', e));
      } catch (e) {
        console.error('Error creating demo sound:', e);
      }
    }
  };
  
  return (
    <div className="text-center">
      <Button
        variant="outline"
        size="sm"
        className={`rounded-full ${isEnabled ? 'bg-green-900/50 border-green-500' : 'bg-black border-white/20'} text-white hover:bg-gray-900`}
        onClick={toggleSound}
        title={isEnabled ? "Mute sound effects" : "Enable sound effects"}
      >
        {isEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
        {isEnabled ? "Sound On" : "Sound Off"}
      </Button>
      
      {!isEnabled && (
        <div className="mt-2 text-xs text-gray-400">
          Click to enable typewriter sounds
        </div>
      )}
    </div>
  );
}

// Add the sound play function to the Window interface
declare global {
  interface Window {
    playTypewriterSound?: () => void;
  }
}