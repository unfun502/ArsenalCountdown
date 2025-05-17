import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { atcb_action } from "add-to-calendar-button";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { SoundButton } from "@/components/SoundButton";

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
  shouldAnimate = false
}: { 
  value: string, 
  initialAnimation?: boolean,
  shouldAnimate?: boolean
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  
  // Handle normal flipping when digit changes (like seconds)
  useEffect(() => {
    // Only animate if the value has changed and should animate
    if (prevValueRef.current !== value && shouldAnimate) {
      // Simple flip animation without cycling through numbers
      prevValueRef.current = value;
      setDisplayValue(value);
    } else if (prevValueRef.current !== value) {
      // Update the display without animation for digits that shouldn't animate
      prevValueRef.current = value;
      setDisplayValue(value);
    }
  }, [value, shouldAnimate]);

  return (
    <div className="splitflap-cell">
      <div className="splitflap-dot left"></div>
      <div className="splitflap-dot right"></div>
      <div className={`splitflap-number ${initialAnimation ? 'splitflap-init-animate' : ''} ${shouldAnimate && prevValueRef.current !== value ? 'flip-enter-active' : ''}`}>
        {displayValue}
      </div>
    </div>
  );
};

// Split flap cell component for letters and other characters
const SplitFlapChar = ({ 
  value, 
  initialAnimation = false
}: { 
  value: string, 
  initialAnimation?: boolean
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
      
      // Rapidly cycle through characters during initial animation
      spinIntervalRef.current = setInterval(() => {
        setDisplayChar(getRandomChar());
      }, 100); // Update every 100ms for a visible cycling effect
      
      // Stop the animation after 2 seconds (matching the main animation duration)
      animationRef.current = setTimeout(() => {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }
        setDisplayChar(value);
        setIsFlipping(false);
      }, 2000);
      
      return () => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        if (animationRef.current) clearTimeout(animationRef.current);
      };
    } else {
      setDisplayChar(value);
    }
  }, [initialAnimation, value]);
  
  // Handle updates after initial animation
  useEffect(() => {
    if (!initialAnimation && !isFlipping) {
      // If the value has changed, update display
      if (displayChar !== value) {
        setDisplayChar(value);
      }
    }
  }, [value, initialAnimation, isFlipping, displayChar]);
  
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
  prevValue
}: { 
  label: string, 
  value: number, 
  initialAnimation: boolean,
  prevValue?: number
}) => {
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
        />
        <SplitFlapDigit 
          value={digit2} 
          initialAnimation={initialAnimation} 
          shouldAnimate={shouldAnimateDigit2}
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
  const initialAnimationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial animation that cycles through random numbers
  useEffect(() => {
    if (initialLoad) {
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
      
      // Update random digits for a visible spinning effect
      const interval = setInterval(generateRandomDigits, 250);
      
      // End the initial animation after 2 seconds
      initialAnimationRef.current = setTimeout(() => {
        clearInterval(interval);
        setInitialLoad(false);
      }, 2000);
      
      return () => {
        clearInterval(interval);
        if (initialAnimationRef.current) {
          clearTimeout(initialAnimationRef.current);
        }
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
  }, [kickoff, timeLeft]);

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

  // Handle add to calendar button
  const handleAddToCalendar = () => {
    const opponent = match?.opponent || "TBD";
    const competition = match?.competition || "Premier League";
    
    atcb_action({
      name: `Arsenal vs ${opponent}`,
      description: `Arsenal FC match: ${competition}`,
      startDate: format(matchDate, 'yyyy-MM-dd'),
      startTime: format(matchDate, 'HH:mm'),
      endTime: format(new Date(matchDate.getTime() + 2 * 60 * 60 * 1000), 'HH:mm'), // Add 2 hours for match duration
      location: match?.venue || "Emirates Stadium, London",
      options: ['Apple', 'Google', 'iCal', 'Outlook.com'],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      trigger: 'click',
      iCalFileName: "arsenal-match",
    });
  };

  // Helper function to chunk text into lines with max length
  const chunkText = (text: string, maxLength: number = 12): string[] => {
    if (!text) return [""];
    
    // If text is shorter than maxLength, return as is
    if (text.length <= maxLength) return [text];
    
    // Find space to break at
    const breakAt = text.substring(0, maxLength).lastIndexOf(' ');
    
    // If no space found, force break at maxLength
    const splitIndex = breakAt > 0 ? breakAt : maxLength;
    
    // Split text
    const firstPart = text.substring(0, splitIndex);
    const restPart = text.substring(splitIndex + 1); // Skip the space if breaking at space
    
    // Recursively chunk the rest
    return [firstPart, ...chunkText(restPart, maxLength)];
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
            />
            <TimeUnit 
              key={timeUnits[1].label} 
              label={timeUnits[1].label} 
              value={timeUnits[1].value}
              prevValue={timeUnits[1].prevValue}
              initialAnimation={initialLoad}
            />
            
            {/* Second row on mobile: Minutes and Seconds */}
            <TimeUnit 
              key={timeUnits[2].label} 
              label={timeUnits[2].label} 
              value={timeUnits[2].value}
              prevValue={timeUnits[2].prevValue}
              initialAnimation={initialLoad}
            />
            <TimeUnit 
              key={timeUnits[3].label} 
              label={timeUnits[3].label} 
              value={timeUnits[3].value}
              prevValue={timeUnits[3].prevValue}
              initialAnimation={initialLoad}
            />
          </div>
        </div>
        
        {/* Match Date Panel */}
        <div className="splitflap-display mt-6">
          <div className="flex flex-col space-y-4">
            {/* Day of Week - Fixed Width Panel for Desktop */}
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                // Handle different screen sizes
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  // For mobile, just render the characters normally
                  return dayOfWeek.split('').map((char, index) => (
                    <SplitFlapChar 
                      key={`day-${index}`} 
                      value={char} 
                      initialAnimation={initialLoad}
                    />
                  ));
                }
                
                // For desktop, ensure exactly 10 cells with left-aligned text
                const chars = dayOfWeek.split('');
                const totalChars = chars.length;
                const emptyFlapsNeeded = 10 - totalChars;
                
                // For left alignment, no left padding needed
                const leftPadding = 0;
                const rightPadding = emptyFlapsNeeded;
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`day-left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Actual characters */}
                    {chars.map((char, index) => (
                      <SplitFlapChar 
                        key={`day-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                      />
                    ))}
                    
                    {/* Right empty flaps */}
                    {Array(rightPadding).fill(0).map((_, i) => (
                      <div key={`day-right-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
            
            {/* Date and Time Split Flap Panel */}
            <div className="flex justify-center space-x-1 md:fixed-width-panel">
              {(() => {
                const timeDisplay = `${matchDateFormatted} ${matchTime}`;
                
                // For mobile, just render the characters normally
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  return timeDisplay.split('').map((char, index) => (
                    <SplitFlapChar 
                      key={`time-${index}`} 
                      value={char} 
                      initialAnimation={initialLoad}
                    />
                  ));
                }
                
                // For desktop, ensure exactly 10 cells with left-aligned text
                const chars = timeDisplay.split('');
                const totalChars = chars.length;
                const emptyFlapsNeeded = Math.max(0, 10 - totalChars);
                
                // For left alignment, no left padding needed
                const leftPadding = 0;
                const rightPadding = emptyFlapsNeeded;
                
                return (
                  <>
                    {/* Left empty flaps */}
                    {Array(leftPadding).fill(0).map((_, i) => (
                      <div key={`time-left-empty-${i}`} className="empty-flap">
                        <div className="splitflap-dot left"></div>
                        <div className="splitflap-dot right"></div>
                      </div>
                    ))}
                    
                    {/* Actual characters, only show what fits in 10 cells */}
                    {chars.slice(0, 10).map((char, index) => (
                      <SplitFlapChar 
                        key={`time-${index}`} 
                        value={char} 
                        initialAnimation={initialLoad}
                      />
                    ))}
                    
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
            
            {/* Opponent Panel (multi-line if needed) */}
            {match?.opponent && (
              <>
                <div className="flex justify-center space-x-1 md:fixed-width-panel">
                  <div className="text-xs text-gray-500 mb-1">OPPONENT</div>
                </div>
                
                {chunkText(match.opponent.toUpperCase(), 12).map((line, lineIndex) => (
                  <div key={`opponent-line-${lineIndex}`} className="flex justify-center space-x-1 md:fixed-width-panel">
                    {(() => {
                      // For mobile, just render the characters normally
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        return line.split('').map((char, index) => (
                          <SplitFlapChar 
                            key={`opponent-${lineIndex}-${index}`} 
                            value={char} 
                            initialAnimation={initialLoad}
                          />
                        ));
                      }
                      
                      // For desktop, ensure exactly 10 cells with left-aligned text
                      const chars = line.split('');
                      const totalChars = chars.length;
                      const emptyFlapsNeeded = Math.max(0, 10 - totalChars);
                      
                      // For left alignment, no left padding needed
                      const leftPadding = 0;
                      const rightPadding = emptyFlapsNeeded;
                      
                      return (
                        <>
                          {/* Left empty flaps */}
                          {Array(leftPadding).fill(0).map((_, i) => (
                            <div key={`opponent-${lineIndex}-left-empty-${i}`} className="empty-flap">
                              <div className="splitflap-dot left"></div>
                              <div className="splitflap-dot right"></div>
                            </div>
                          ))}
                          
                          {/* Actual characters */}
                          {chars.map((char, index) => (
                            <SplitFlapChar 
                              key={`opponent-${lineIndex}-${index}`} 
                              value={char} 
                              initialAnimation={initialLoad}
                            />
                          ))}
                          
                          {/* Right empty flaps */}
                          {Array(rightPadding).fill(0).map((_, i) => (
                            <div key={`opponent-${lineIndex}-right-empty-${i}`} className="empty-flap">
                              <div className="splitflap-dot left"></div>
                              <div className="splitflap-dot right"></div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </>
            )}
            
            {/* Competition Panel (multi-line if needed) */}
            {match?.competition && (
              <>
                <div className="flex justify-center space-x-1 md:fixed-width-panel">
                  <div className="text-xs text-gray-500 mb-1">COMPETITION</div>
                </div>
                
                {match.competition.toLowerCase() === "premier league" ? 
                  // Special case for "Premier League" - split into exactly two lines
                  ["PREMIER", "LEAGUE"].map((line, lineIndex) => (
                    <div key={`competition-line-${lineIndex}`} className="flex justify-center space-x-1 md:fixed-width-panel">
                      {(() => {
                        // For mobile, just render the characters normally
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          return line.split('').map((char, index) => (
                            <SplitFlapChar 
                              key={`competition-${lineIndex}-${index}`} 
                              value={char} 
                              initialAnimation={initialLoad}
                            />
                          ));
                        }
                        
                        // For desktop, ensure exactly 10 cells with left-aligned text
                        const chars = line.split('');
                        const totalChars = chars.length;
                        const emptyFlapsNeeded = Math.max(0, 10 - totalChars);
                        
                        // For left alignment, no left padding needed
                        const leftPadding = 0;
                        const rightPadding = emptyFlapsNeeded;
                        
                        return (
                          <>
                            {/* Left empty flaps */}
                            {Array(leftPadding).fill(0).map((_, i) => (
                              <div key={`competition-${lineIndex}-left-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                            
                            {/* Actual characters */}
                            {chars.map((char, index) => (
                              <SplitFlapChar 
                                key={`competition-${lineIndex}-${index}`} 
                                value={char} 
                                initialAnimation={initialLoad}
                              />
                            ))}
                            
                            {/* Right empty flaps */}
                            {Array(rightPadding).fill(0).map((_, i) => (
                              <div key={`competition-${lineIndex}-right-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  ))
                  :
                  // Other competitions split by max length
                  chunkText(match.competition.toUpperCase(), 12).map((line, lineIndex) => (
                    <div key={`competition-line-${lineIndex}`} className="flex justify-center space-x-1 md:fixed-width-panel">
                      {(() => {
                        // For mobile, just render the characters normally
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          return line.split('').map((char, index) => (
                            <SplitFlapChar 
                              key={`competition-${lineIndex}-${index}`} 
                              value={char} 
                              initialAnimation={initialLoad}
                            />
                          ));
                        }
                        
                        // For desktop, ensure exactly 10 cells with left-aligned text
                        const chars = line.split('');
                        const totalChars = chars.length;
                        const emptyFlapsNeeded = Math.max(0, 10 - totalChars);
                        
                        // For left alignment, no left padding needed
                        const leftPadding = 0;
                        const rightPadding = emptyFlapsNeeded;
                        
                        return (
                          <>
                            {/* Left empty flaps */}
                            {Array(leftPadding).fill(0).map((_, i) => (
                              <div key={`competition-${lineIndex}-left-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                            
                            {/* Actual characters */}
                            {chars.map((char, index) => (
                              <SplitFlapChar 
                                key={`competition-${lineIndex}-${index}`} 
                                value={char} 
                                initialAnimation={initialLoad}
                              />
                            ))}
                            
                            {/* Right empty flaps */}
                            {Array(rightPadding).fill(0).map((_, i) => (
                              <div key={`competition-${lineIndex}-right-empty-${i}`} className="empty-flap">
                                <div className="splitflap-dot left"></div>
                                <div className="splitflap-dot right"></div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  ))
                }
              </>
            )}
            
            {/* TV broadcast Panel */}
            {match?.broadcaster && (
              <>
                <div className="flex justify-center space-x-1 md:fixed-width-panel">
                  <div className="text-xs text-gray-500 mb-1">WATCH ON</div>
                </div>
                
                <div className="flex justify-center space-x-1 md:fixed-width-panel">
                  {(() => {
                    const broadcastText = match.broadcaster.toUpperCase();
                    
                    // For mobile, just render the characters normally
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      return broadcastText.split('').map((char, index) => (
                        <SplitFlapChar 
                          key={`broadcast-${index}`} 
                          value={char} 
                          initialAnimation={initialLoad}
                        />
                      ));
                    }
                    
                    // For desktop, ensure exactly 10 cells with left-aligned text
                    const chars = broadcastText.split('');
                    const totalChars = chars.length;
                    const emptyFlapsNeeded = Math.max(0, 10 - totalChars);
                    
                    // For left alignment, no left padding needed
                    const leftPadding = 0;
                    const rightPadding = emptyFlapsNeeded;
                    
                    return (
                      <>
                        {/* Left empty flaps */}
                        {Array(leftPadding).fill(0).map((_, i) => (
                          <div key={`broadcast-left-empty-${i}`} className="empty-flap">
                            <div className="splitflap-dot left"></div>
                            <div className="splitflap-dot right"></div>
                          </div>
                        ))}
                        
                        {/* Actual characters */}
                        {chars.slice(0, 10).map((char, index) => (
                          <SplitFlapChar 
                            key={`broadcast-${index}`} 
                            value={char} 
                            initialAnimation={initialLoad}
                          />
                        ))}
                        
                        {/* Right empty flaps */}
                        {Array(rightPadding).fill(0).map((_, i) => (
                          <div key={`broadcast-right-empty-${i}`} className="empty-flap">
                            <div className="splitflap-dot left"></div>
                            <div className="splitflap-dot right"></div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Sound Button and Calendar Button */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8">
          <SoundButton />
          
          <Button
            onClick={handleAddToCalendar}
            variant="outline"
            className="bg-black/50 text-white border-white/20 hover:bg-gray-900"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Add to Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}