
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { atcb_action } from "add-to-calendar-button";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Volume2, VolumeX } from "lucide-react";
import { BROADCASTERS } from "@shared/constants";
import { 
  enableSound, 
  disableSound, 
  playSound, 
  isSoundEnabled,
  initSoundState
} from "@/assets/audio";

interface CountdownProps {
  kickoff: Date;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Split flap cell component for individual digits
const SplitFlapDigit = ({ 
  value, 
  initialAnimation = false,
  shouldAnimate = false,
  playSound = () => {} // Pass the sound function as a prop
}: { 
  value: string, 
  initialAnimation?: boolean,
  shouldAnimate?: boolean,
  playSound?: () => void 
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(initialAnimation);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate random digit
  const getRandomDigit = () => {
    return Math.floor(Math.random() * 10).toString();
  };
  
  // Handle initial animation with spinning digits
  useEffect(() => {
    if (initialAnimation) {
      setIsFlipping(true);
      
      // Play sound at the start of animation
      playSound();
      
      // Rapidly cycle through digits during initial animation
      spinIntervalRef.current = setInterval(() => {
        setDisplayValue(getRandomDigit());
        
        // Occasionally play flip sound during rapid cycling
        if (Math.random() < 0.2) {
          playSound();
        }
      }, 100); // Update every 100ms for a visible cycling effect
      
      // Stop the animation after 2 seconds
      animationRef.current = setTimeout(() => {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }
        setDisplayValue(value);
        setIsFlipping(false);
        
        // Play final click sound when settling on final value
        playSound();
      }, 2000);
      
      return () => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        if (animationRef.current) clearTimeout(animationRef.current);
      };
    } else {
      setDisplayValue(value);
    }
  }, [initialAnimation, value, playSound]);
  
  // Handle value changes after initial animation
  useEffect(() => {
    if (!initialAnimation && !isFlipping && shouldAnimate) {
      if (displayValue !== value) {
        setIsFlipping(true);
        playSound();
        
        // Rapidly cycle through a few random digits
        let cycleCount = 0;
        const maxCycles = 5; // Number of digits to cycle through
        
        const cycleInterval = setInterval(() => {
          setDisplayValue(getRandomDigit());
          cycleCount++;
          
          if (cycleCount >= maxCycles) {
            clearInterval(cycleInterval);
            setDisplayValue(value);
            setIsFlipping(false);
          }
        }, 50); // Faster cycling for a quick animation
        
        return () => clearInterval(cycleInterval);
      }
    } else if (!initialAnimation && !isFlipping) {
      // Just update the value without animation
      if (displayValue !== value) {
        setDisplayValue(value);
      }
    }
  }, [value, initialAnimation, isFlipping, shouldAnimate, displayValue, playSound]);

  return (
    <div className="splitflap-cell">
      <div className="splitflap-dot left"></div>
      <div className="splitflap-dot right"></div>
      <div className={`splitflap-number ${initialAnimation ? 'splitflap-init-animate' : ''} ${isFlipping ? 'flip-enter-active' : ''}`}>
        {displayValue}
      </div>
    </div>
  );
};

// Split flap cell component for letters and other characters
const SplitFlapChar = ({ 
  value, 
  initialAnimation = false,
  playSound = () => {} // Pass the sound function as a prop
}: { 
  value: string, 
  initialAnimation?: boolean,
  playSound?: () => void
}) => {
  const [displayChar, setDisplayChar] = useState(value);
  const [isFlipping, setIsFlipping] = useState(initialAnimation);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate random character based on the type of input character
  const getRandomChar = () => {
    if (/[A-Z]/.test(value)) {
      // Random uppercase letter
      const charCode = Math.floor(Math.random() * 26) + 65;
      return String.fromCharCode(charCode);
    } else if (/[0-9]/.test(value)) {
      // Random digit
      return Math.floor(Math.random() * 10).toString();
    } else if (value === ' ') {
      // For spaces, return space
      return ' ';
    } else {
      // For other special characters, return as is or pick from common ones
      const specialChars = ['-', '.', ':', '/', value];
      return specialChars[Math.floor(Math.random() * specialChars.length)];
    }
  };
  
  // Handle initial animation with spinning characters
  useEffect(() => {
    if (initialAnimation) {
      setIsFlipping(true);
      
      // Play sound at the start of animation
      playSound();
      
      // Rapidly cycle through characters during initial animation
      spinIntervalRef.current = setInterval(() => {
        setDisplayChar(getRandomChar());
        
        // Occasionally play flip sound during rapid cycling (but not every frame to avoid audio overload)
        if (Math.random() < 0.2) { // 20% chance to play sound on each cycle
          playSound();
        }
      }, 100); // Update every 100ms for a visible cycling effect
      
      // Stop the animation after 2 seconds (matching the main animation duration)
      animationRef.current = setTimeout(() => {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }
        setDisplayChar(value);
        setIsFlipping(false);
        
        // Play final click sound when settling on final value
        playSound();
      }, 2000);
      
      return () => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        if (animationRef.current) clearTimeout(animationRef.current);
      };
    } else {
      setDisplayChar(value);
    }
  }, [initialAnimation, value, playSound]);
  
  // Handle updates after initial animation
  useEffect(() => {
    if (!initialAnimation && !isFlipping) {
      // If the value has changed, play a sound and update display
      if (displayChar !== value) {
        playSound();
        setDisplayChar(value);
      }
    }
  }, [value, initialAnimation, isFlipping, displayChar, playSound]);
  
  return (
    <div className="splitflap-cell">
      <div className="splitflap-dot left"></div>
      <div className="splitflap-dot right"></div>
      <div className={`splitflap-number ${initialAnimation ? 'splitflap-init-animate' : ''} ${isFlipping ? 'flip-enter-active' : ''}`}>
        {displayChar}
      </div>
    </div>
  );
};

// Component to display a time unit (days, hours, etc.) with two digits
const TimeUnit = ({ 
  label, 
  value, 
  initialAnimation,
  prevValue,
  playSound
}: { 
  label: string, 
  value: number, 
  initialAnimation: boolean,
  prevValue?: number,
  playSound?: () => void
}) => {
  const playClickSound = playSound || (() => {});
  const displayValue = value.toString().padStart(2, '0');
  const digit1 = displayValue[0];
  const digit2 = displayValue[1];
  
  // Determine if digits should animate based on changes
  let shouldAnimateDigit1 = false;
  let shouldAnimateDigit2 = false;
  
  if (prevValue !== undefined) {
    const prevDisplayValue = prevValue.toString().padStart(2, '0');
    shouldAnimateDigit1 = digit1 !== prevDisplayValue[0];
    shouldAnimateDigit2 = digit2 !== prevDisplayValue[1];
  }
  
  // For seconds, both digits should always animate on change
  if (label === "SECS") {
    shouldAnimateDigit1 = true;
    shouldAnimateDigit2 = true;
  }
  
  return (
    <div className="splitflap-unit">
      <div className="splitflap-digits">
        <SplitFlapDigit 
          value={digit1} 
          initialAnimation={initialAnimation} 
          shouldAnimate={shouldAnimateDigit1}
          playSound={playClickSound}
        />
        <SplitFlapDigit 
          value={digit2} 
          initialAnimation={initialAnimation} 
          shouldAnimate={shouldAnimateDigit2}
          playSound={playClickSound}
        />
      </div>
      <div className="splitflap-unit-label">{label}</div>
    </div>
  );
};

export default function Countdown({ kickoff, match }: CountdownProps & { match: any }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [prevTimeLeft, setPrevTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fakeDigits, setFakeDigits] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [soundOn, setSoundOn] = useState(false);
  const [userCountry, setUserCountry] = useState<string>("");
  const initialAnimationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial animation that cycles through random numbers more slowly
  useEffect(() => {
    if (initialLoad) {
      // Initial animation plays here
      
      // Generate random digits during the initial animation
      const generateRandomDigits = () => {
        setFakeDigits({
          days: Math.floor(Math.random() * 99),
          hours: Math.floor(Math.random() * 24),
          minutes: Math.floor(Math.random() * 60), 
          seconds: Math.floor(Math.random() * 60)
        });
      };
      
      // Start with random digits
      generateRandomDigits();
      
      // Update random digits more slowly (250ms) for a visible spinning effect
      const interval = setInterval(generateRandomDigits, 250);
      
      // End the initial animation after 2 seconds
      initialAnimationRef.current = setTimeout(() => {
        clearInterval(interval);
        setInitialLoad(false);
        
        // Animation ends here
      }, 2000);
      
      return () => {
        clearInterval(interval);
        if (initialAnimationRef.current) {
          clearTimeout(initialAnimationRef.current);
        }
        
        // Cleanup if component unmounts
      };
    }
  }, [initialLoad]);
  
  // Regular countdown logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((kickoff.getTime() - now.getTime()) / 1000);
      
      if (diffInSeconds <= 0) return;

      // Save previous values before updating
      setPrevTimeLeft(timeLeft);

      const days = Math.floor(diffInSeconds / (24 * 60 * 60));
      const hours = Math.floor((diffInSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
      const seconds = Math.floor(diffInSeconds % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [kickoff]);

  // Choose between actual countdown and random values for initial animation
  const displayValues = initialLoad ? fakeDigits : timeLeft;
  
  const timeUnits = [
    { label: "DAYS", value: displayValues.days, prevValue: prevTimeLeft.days },
    { label: "HOURS", value: displayValues.hours, prevValue: prevTimeLeft.hours },
    { label: "MINS", value: displayValues.minutes, prevValue: prevTimeLeft.minutes },
    { label: "SECS", value: displayValues.seconds, prevValue: prevTimeLeft.seconds }
  ];

  // Create day, date and time display for the match
  const matchDate = new Date(kickoff);
  const dayOfWeek = format(matchDate, 'EEEE').toUpperCase();
  const matchDateFormatted = format(matchDate, 'MMM dd').toUpperCase();
  const matchTime = format(matchDate, 'hh:mm a').toUpperCase();
  
  // Format match time for split flap display
  const [hours, minutesWithAMPM] = matchTime.split(':');
  const [minutes, ampm] = minutesWithAMPM.split(' ');
  
  // Update every second
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Initialize sound state on component mount
  useEffect(() => {
    // Check for saved preference
    const hasSavedPreference = initSoundState();
    if (hasSavedPreference) {
      setSoundOn(true);
    }
  }, []);

  // Fetch user location for broadcaster info
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => setUserCountry(data.country_code))
      .catch(err => console.error("Failed to get user location:", err));
  }, []);

  // Simple sound playback function
  const playClickSound = () => {
    if (!soundOn) return;
    playSound();
  };
    
  // Handle toggling sound on/off
  const toggleSound = () => {
    // Toggle sound state
    const newSoundState = !soundOn;
    setSoundOn(newSoundState);
    
    // Get direct reference to the audio element
    const audioElement = document.getElementById('typewriterSound') as HTMLAudioElement;
    
    if (newSoundState) {
      console.log("Sound enabled");
      enableSound();
      
      // Try to play the sound directly using the audio element
      if (audioElement) {
        audioElement.currentTime = 0; // Reset to beginning
        audioElement.volume = 0.7;
        
        // Try to play and handle any errors
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Sound played successfully");
            })
            .catch(error => {
              console.error("Error playing sound:", error);
            });
        }
      }
    } else {
      console.log("Sound disabled");
      disableSound();
      
      // Stop any playing sound
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    }
    
    // Always trigger a full animation cycle to demonstrate the effect
    console.log("Triggering animation demo");
    setInitialLoad(true);
    
    // Reset all the time values to ensure a full refresh of the display
    setFakeDigits({
      days: Math.floor(Math.random() * 99),
      hours: Math.floor(Math.random() * 24),
      minutes: Math.floor(Math.random() * 60),
      seconds: Math.floor(Math.random() * 60)
    });
    
    // Stop the animation after 2 seconds
    setTimeout(() => {
      console.log("Animation demo complete");
      setInitialLoad(false);
    }, 2000);
  };

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardContent className="p-0">
        {/* Title using split flap display */}
        <div className="mb-6">
          <div className="splitflap-display py-3">
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                const text = "ARSENAL";
                
                // For mobile, just render the characters normally
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  return text.split('').map((char: string, index: number) => (
                    <SplitFlapChar 
                      key={`title-${index}`} 
                      value={char} 
                      initialAnimation={initialLoad}
                    />
                  ));
                }
                
                // For desktop, ensure exactly 10 cells with left-aligned text
                const chars = text.split('');
                const totalChars = chars.length;
                const emptyFlapsNeeded = 10 - totalChars;
                
                // For left alignment, no left padding needed
                const leftPadding = 0;
                const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`title-left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Actual characters */}
                    {chars.map((char: string, index: number) => (
                      <SplitFlapChar 
                        key={`title-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                        playSound={playClickSound}
                      />
                    ))}
                    
                    {/* Right empty flaps */}
                    {Array(rightPadding).fill(0).map((_, i) => (
                      <div key={`title-right-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        
        <div className="splitflap-display mb-6">
          {/* Responsive grid - 2x2 on mobile, 4x1 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* First row on mobile: Days and Hours */}
            <TimeUnit 
              key={timeUnits[0].label} 
              label={timeUnits[0].label} 
              value={timeUnits[0].value}
              prevValue={timeUnits[0].prevValue}
              initialAnimation={initialLoad}
              playSound={playClickSound}
            />
            <TimeUnit 
              key={timeUnits[1].label} 
              label={timeUnits[1].label} 
              value={timeUnits[1].value}
              prevValue={timeUnits[1].prevValue}
              initialAnimation={initialLoad}
              playSound={playClickSound}
            />
            
            {/* Second row on mobile: Minutes and Seconds */}
            <TimeUnit 
              key={timeUnits[2].label} 
              label={timeUnits[2].label} 
              value={timeUnits[2].value}
              prevValue={timeUnits[2].prevValue}
              initialAnimation={initialLoad}
              playSound={playClickSound}
            />
            <TimeUnit 
              key={timeUnits[3].label} 
              label={timeUnits[3].label} 
              value={timeUnits[3].value}
              prevValue={timeUnits[3].prevValue}
              initialAnimation={initialLoad}
              playSound={playClickSound}
            />
          </div>
        </div>
        
        {/* Match Date Panel */}
        <div className="splitflap-display mt-6">
          <div className="flex flex-col space-y-4">
            {/* Day of Week */}
            {/* Day of Week - Fixed Width Panel for Desktop */}
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                // For mobile, just render the characters normally
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  return dayOfWeek.split('').map((char: string, index: number) => (
                    <SplitFlapChar 
                      key={`day-${index}`} 
                      value={char} 
                      initialAnimation={initialLoad}
                      playSound={playClickSound}
                    />
                  ));
                }
                
                // For desktop, ensure exactly 10 cells with left-aligned text
                const chars = dayOfWeek.split('');
                const totalChars = chars.length;
                const emptyFlapsNeeded = 10 - totalChars;
                
                // For left alignment, no left padding needed
                const leftPadding = 0;
                const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Actual characters */}
                    {chars.map((char: string, index: number) => (
                      <SplitFlapChar 
                        key={`day-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                        playSound={playClickSound}
                      />
                    ))}
                    
                    {/* Right empty flaps */}
                    {Array(rightPadding).fill(0).map((_, i) => (
                      <div key={`right-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
            
            {/* Date (without year) - Fixed Width Panel for Desktop */}
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                // For mobile, just render the characters normally
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  return matchDateFormatted.split('').map((char: string, index: number) => (
                    <SplitFlapChar 
                      key={`date-${index}`} 
                      value={char} 
                      initialAnimation={initialLoad}
                    />
                  ));
                }
                
                // For desktop, ensure exactly 10 cells with centered text
                const chars = matchDateFormatted.split('');
                const totalChars = chars.length;
                const emptyFlapsNeeded = 10 - totalChars;
                
                // Calculate left and right padding
                const leftPadding = 0;
                const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`date-left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Actual characters */}
                    {chars.map((char: string, index: number) => (
                      <SplitFlapChar 
                        key={`date-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                        playSound={playClickSound}
                      />
                    ))}
                    
                    {/* Right empty flaps */}
                    {Array(rightPadding).fill(0).map((_, i) => (
                      <div key={`date-right-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
            
            {/* Match Time - Fixed Width Panel for Desktop */}
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                // Create the time display components
                const timeComponents = [
                  <SplitFlapDigit key="hour1" value={hours[0]} initialAnimation={initialLoad} shouldAnimate={false} playSound={playClickSound} />,
                  <SplitFlapDigit key="hour2" value={hours[1]} initialAnimation={initialLoad} shouldAnimate={false} playSound={playClickSound} />,
                  <SplitFlapChar key="colon" value=":" initialAnimation={initialLoad} playSound={playClickSound} />,
                  <SplitFlapDigit key="min1" value={minutes[0]} initialAnimation={initialLoad} shouldAnimate={false} playSound={playClickSound} />,
                  <SplitFlapDigit key="min2" value={minutes[1]} initialAnimation={initialLoad} shouldAnimate={false} playSound={playClickSound} />,
                  <SplitFlapChar key="space" value=" " initialAnimation={initialLoad} playSound={playClickSound} />
                ];
                
                // Add AM/PM
                const ampmChars = ampm.split('').map((char: string, index: number) => (
                  <SplitFlapChar 
                    key={`ampm-${index}`} 
                    value={char} 
                    initialAnimation={initialLoad}
                    playSound={playClickSound}
                  />
                ));
                
                // For mobile, just render normally
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  return [...timeComponents, ...ampmChars];
                }
                
                // For desktop, ensure exactly 10 cells with centered text
                const allComponents = [...timeComponents, ...ampmChars];
                const totalComponents = allComponents.length;
                const emptyFlapsNeeded = 10 - totalComponents;
                
                // Calculate left and right padding
                const leftPadding = 0;
                const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`time-left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Time components */}
                    {allComponents}
                    
                    {/* Right empty flaps */}
                    {Array(rightPadding).fill(0).map((_, i) => (
                      <div key={`time-right-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        
        {/* Opponent Name Panel */}
        <div className="splitflap-display mt-6">
          <div className="flex flex-col space-y-4">
            {(() => {
              // Determine opponent based on whether Arsenal is home or away
              const isArsenalHome = match.homeTeam.toLowerCase().includes('arsenal');
              const opponentName = (isArsenalHome ? match.awayTeam : match.homeTeam).toUpperCase();
              if (opponentName.length <= 12) {
                return (
                  <div className="flex justify-center space-x-1 md:fixed-width-panel">
                    {(() => {
                      // For mobile, just render the characters normally
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        return opponentName.split('').map((char: string, index: number) => (
                          <SplitFlapChar 
                            key={`opponent-${index}`} 
                            value={char} 
                            initialAnimation={initialLoad}
                          />
                        ));
                      }
                      
                      // For desktop, ensure exactly 10 cells with centered text
                      const chars = opponentName.split('');
                      const totalChars = chars.length;
                      const emptyFlapsNeeded = 10 - totalChars;
                      
                      // Calculate left and right padding
                      const leftPadding = 0;
                      const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                      
                      return (
                        <>
                          {/* Left empty flaps */}
                          {Array(leftPadding).fill(0).map((_, i) => (
                            <div key={`opp-left-empty-${i}`} className="empty-flap">
                              <div className="splitflap-dot left"></div>
                              <div className="splitflap-dot right"></div>
                            </div>
                          ))}
                          
                          {/* Actual characters */}
                          {chars.map((char: string, index: number) => (
                            <SplitFlapChar 
                              key={`opponent-${index}`} 
                              value={char} 
                              initialAnimation={initialLoad}
                              playSound={playClickSound}
                            />
                          ))}
                          
                          {/* Right empty flaps */}
                          {Array(rightPadding).fill(0).map((_, i) => (
                            <div key={`opp-right-empty-${i}`} className="empty-flap">
                              <div className="splitflap-dot left"></div>
                              <div className="splitflap-dot right"></div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                );
              } else {
                // Split into two lines
                const midPoint = Math.ceil(opponentName.length / 2);
                const firstLine = opponentName.substring(0, midPoint);
                const secondLine = opponentName.substring(midPoint);
                
                return (
                  <>
                    <div className="flex justify-center space-x-1 md:fixed-width-panel">
                      {(() => {
                        // For mobile, just render the characters normally
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          return firstLine.split('').map((char: string, index: number) => (
                            <SplitFlapChar 
                              key={`opponent1-${index}`} 
                              value={char} 
                              initialAnimation={initialLoad}
                              playSound={playClickSound}
                            />
                          ));
                        }
                        
                        // For desktop, ensure exactly 10 cells with centered text
                        const chars = firstLine.split('');
                        const totalChars = chars.length;
                        const emptyFlapsNeeded = 10 - totalChars;
                        
                        // Calculate left and right padding
                        const leftPadding = 0;
                        const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                        
                        return (
                          <>
                            {/* Left empty flaps */}
                            {Array(leftPadding).fill(0).map((_, i) => (
                              <div key={`opp1-left-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                            
                            {/* Actual characters */}
                            {chars.map((char: string, index: number) => (
                              <SplitFlapChar 
                                key={`opponent1-${index}`} 
                                value={char} 
                                initialAnimation={initialLoad}
                              />
                            ))}
                            
                            {/* Right empty flaps */}
                            {Array(rightPadding).fill(0).map((_, i) => (
                              <div key={`opp1-right-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-center space-x-1 md:fixed-width-panel">
                      {(() => {
                        // For mobile, just render the characters normally
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          return secondLine.split('').map((char: string, index: number) => (
                            <SplitFlapChar 
                              key={`opponent2-${index}`} 
                              value={char} 
                              initialAnimation={initialLoad}
                              playSound={playClickSound}
                            />
                          ));
                        }
                        
                        // For desktop, ensure exactly 10 cells with centered text
                        const chars = secondLine.split('');
                        const totalChars = chars.length;
                        const emptyFlapsNeeded = 10 - totalChars;
                        
                        // Calculate left and right padding
                        const leftPadding = 0;
                        const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                        
                        return (
                          <>
                            {/* Left empty flaps */}
                            {Array(leftPadding).fill(0).map((_, i) => (
                              <div key={`opp2-left-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                            
                            {/* Actual characters */}
                            {chars.map((char: string, index: number) => (
                              <SplitFlapChar 
                                key={`opponent2-${index}`} 
                                value={char} 
                                initialAnimation={initialLoad}
                              />
                            ))}
                            
                            {/* Right empty flaps */}
                            {Array(rightPadding).fill(0).map((_, i) => (
                              <div key={`opp2-right-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
        
        {/* Competition and TV Channel Panel */}
        <div className="splitflap-display mt-6">
          <div className="flex flex-col space-y-4">
            {/* Competition Name - Split into two lines */}
            {match.competition === "Premier League" ? (
              <>
                <div className="flex justify-center space-x-1 md:fixed-width-panel">
                  {(() => {
                    const text = "PREMIER";
                    
                    // For mobile, just render the characters normally
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      return text.split('').map((char: string, index: number) => (
                        <SplitFlapChar 
                          key={`competition1-${index}`} 
                          value={char} 
                          initialAnimation={initialLoad}
                          playSound={playClickSound}
                        />
                      ));
                    }
                    
                    // For desktop, ensure exactly 10 cells with centered text
                    const chars = text.split('');
                    const totalChars = chars.length;
                    const emptyFlapsNeeded = 10 - totalChars;
                    
                    // Calculate left and right padding
                    const leftPadding = 0;
                    const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                    
                    return (
                      <>
                        {/* Left empty flaps */}
                        {Array(leftPadding).fill(0).map((_, i) => (
                          <div key={`premier-left-empty-${i}`} className="empty-flap">
                            <div className="splitflap-dot left"></div>
                            <div className="splitflap-dot right"></div>
                          </div>
                        ))}
                        
                        {/* Actual characters */}
                        {chars.map((char: string, index: number) => (
                          <SplitFlapChar 
                            key={`competition1-${index}`} 
                            value={char} 
                            initialAnimation={initialLoad}
                            playSound={playClickSound}
                          />
                        ))}
                        
                        {/* Right empty flaps */}
                        {Array(rightPadding).fill(0).map((_, i) => (
                          <div key={`premier-right-empty-${i}`} className="empty-flap">
                            <div className="splitflap-dot left"></div>
                            <div className="splitflap-dot right"></div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-center space-x-1 md:fixed-width-panel">
                  {(() => {
                    const text = "LEAGUE";
                    
                    // For mobile, just render the characters normally
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      return text.split('').map((char: string, index: number) => (
                        <SplitFlapChar 
                          key={`competition2-${index}`} 
                          value={char} 
                          initialAnimation={initialLoad}
                          playSound={playClickSound}
                        />
                      ));
                    }
                    
                    // For desktop, ensure exactly 10 cells with centered text
                    const chars = text.split('');
                    const totalChars = chars.length;
                    const emptyFlapsNeeded = 10 - totalChars;
                    
                    // Calculate left and right padding
                    const leftPadding = 0;
                    const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                    
                    return (
                      <>
                        {/* Left empty flaps */}
                        {Array(leftPadding).fill(0).map((_, i) => (
                          <div key={`league-left-empty-${i}`} className="empty-flap">
                            <div className="splitflap-dot left"></div>
                            <div className="splitflap-dot right"></div>
                          </div>
                        ))}
                        
                        {/* Actual characters */}
                        {chars.map((char: string, index: number) => (
                          <SplitFlapChar 
                            key={`competition2-${index}`} 
                            value={char} 
                            initialAnimation={initialLoad}
                            playSound={playClickSound}
                          />
                        ))}
                        
                        {/* Right empty flaps */}
                        {Array(rightPadding).fill(0).map((_, i) => (
                          <div key={`league-right-empty-${i}`} className="empty-flap">
                            <div className="splitflap-dot left"></div>
                            <div className="splitflap-dot right"></div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex justify-center space-x-1 md:fixed-width-panel">
                {(() => {
                  const text = match.competition.toUpperCase();
                  
                  // For mobile, just render the characters normally
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    return text.split('').map((char: string, index: number) => (
                      <SplitFlapChar 
                        key={`competition-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                      />
                    ));
                  }
                  
                  // For desktop, ensure exactly 10 cells with centered text
                  const chars = text.split('');
                  const totalChars = chars.length;
                  const emptyFlapsNeeded = 10 - totalChars;
                  
                  // Calculate left and right padding
                  const leftPadding = 0;
                  const rightPadding = emptyFlapsNeeded; // All empty flaps go to the right
                  
                  return (
                    <>
                      {/* Left empty flaps */}
                      {Array(leftPadding).fill(0).map((_, i) => (
                        <div key={`comp-left-empty-${i}`} className="empty-flap">
                          <div className="splitflap-dot left"></div>
                          <div className="splitflap-dot right"></div>
                        </div>
                      ))}
                      
                      {/* Actual characters */}
                      {chars.map((char: string, index: number) => (
                        <SplitFlapChar 
                          key={`competition-${index}`} 
                          value={char} 
                          initialAnimation={initialLoad}
                        />
                      ))}
                      
                      {/* Right empty flaps */}
                      {Array(rightPadding).fill(0).map((_, i) => (
                        <div key={`comp-right-empty-${i}`} className="empty-flap">
                          <div className="splitflap-dot left"></div>
                          <div className="splitflap-dot right"></div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* TV Channel */}
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                // Get broadcaster based on user's country
                const broadcaster = userCountry ? BROADCASTERS[userCountry] : null;
                const broadcasterName = broadcaster?.name || "CHECK LOCAL";
                let text = broadcasterName.toUpperCase();
                
                // Limit text to 10 characters for desktop display
                if (typeof window !== 'undefined' && window.innerWidth >= 768 && text.length > 10) {
                  text = text.substring(0, 10);
                }
                
                // For mobile, just render the characters normally
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  return text.split('').map((char: string, index: number) => (
                    <SplitFlapChar 
                      key={`channel-${index}`} 
                      value={char} 
                      initialAnimation={initialLoad}
                    />
                  ));
                }
                
                // For desktop, ensure exactly 10 cells with centered text
                const chars = text.split('');
                const totalChars = chars.length;
                const emptyFlapsNeeded = 10 - totalChars;
                
                // Calculate left and right padding (ensure non-negative)
                const leftPadding = 0;
                const rightPadding = Math.max(0, emptyFlapsNeeded); // Ensure non-negative
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`channel-left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Actual characters */}
                    {chars.map((char: string, index: number) => (
                      <SplitFlapChar 
                        key={`channel-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                        playSound={playClickSound}
                      />
                    ))}
                    
                    {/* Right empty flaps */}
                    {Array(rightPadding).fill(0).map((_, i) => (
                      <div key={`channel-right-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* Sound toggle button */}
          <div className="mt-4 text-center">
            {/* Inline audio element that can be controlled directly */}
            <audio 
              id="typewriterSound" 
              src="/sounds/typewriter.mp3" 
              preload="auto"
              style={{ display: 'none' }}
            />
            
            <Button
              variant="outline"
              size="sm"
              className={`rounded-full ${soundOn ? 'bg-green-900/50 border-green-500' : 'bg-black border-white/20'} text-white hover:bg-gray-900`}
              onClick={toggleSound}
              title={soundOn ? "Mute sound effects" : "Enable sound effects"}
            >
              {soundOn ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {soundOn ? "Sound On" : "Sound Off"}
            </Button>
            
            {!soundOn && (
              <div className="mt-2 text-xs text-gray-400">
                Click to enable sound effects
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
