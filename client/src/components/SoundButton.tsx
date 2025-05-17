import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

// A standalone sound button component that handles all audio independently
export function SoundButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize on component mount
  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/sounds/typewriter.mp3');
    
    // Check if sound was previously enabled
    const savedState = localStorage.getItem('arsenal-countdown-sound');
    if (savedState === 'on') {
      setIsEnabled(true);
    }
    
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Handle manual play with direct interaction
  const handlePlayAudio = () => {
    if (!audioRef.current || isPlaying) return;
    
    // Reset to beginning
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 0.7;
    
    // Try to play with full error handling
    setIsPlaying(true);
    
    audioRef.current.play()
      .then(() => {
        console.log("Sound played successfully");
        
        // Reset play state when sound finishes
        audioRef.current!.onended = () => {
          setIsPlaying(false);
        };
      })
      .catch(error => {
        console.error("Audio playback failed:", error);
        setIsPlaying(false);
      });
  };
  
  // Toggle sound on/off
  const toggleSound = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Save preference
    localStorage.setItem('arsenal-countdown-sound', newState ? 'on' : 'off');
    
    // If enabling, try to play a demo sound
    if (newState) {
      handlePlayAudio();
    }
    
    // Trigger a custom event for other components to listen for
    window.dispatchEvent(new CustomEvent('sound-toggle', { 
      detail: { enabled: newState } 
    }));
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
          Click to enable sound effects
        </div>
      )}
    </div>
  );
}