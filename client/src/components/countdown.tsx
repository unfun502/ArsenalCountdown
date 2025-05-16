
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

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
  return (
    <div className="splitflap-cell">
      <div className="splitflap-dot left"></div>
      <div className="splitflap-dot right"></div>
      <div className={`splitflap-number ${initialAnimation ? 'splitflap-init-animate' : ''}`}>
        {value}
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

export default function Countdown({ kickoff }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [prevTimeLeft, setPrevTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fakeDigits, setFakeDigits] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const initialAnimationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial animation that cycles through random numbers more slowly
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
      
      // Update random digits more slowly (250ms) for a visible spinning effect
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
  }, [kickoff]);

  // Choose between actual countdown and random values for initial animation
  const displayValues = initialLoad ? fakeDigits : timeLeft;
  
  const timeUnits = [
    { label: "DAYS", value: displayValues.days, prevValue: prevTimeLeft.days },
    { label: "HOURS", value: displayValues.hours, prevValue: prevTimeLeft.hours },
    { label: "MINS", value: displayValues.minutes, prevValue: prevTimeLeft.minutes },
    { label: "SECS", value: displayValues.seconds, prevValue: prevTimeLeft.seconds }
  ];

  // Create day, date and time display for current time
  const now = new Date();
  const dayOfWeek = format(now, 'EEEE').toUpperCase();
  const currentDate = format(now, 'MMM dd, yyyy').toUpperCase();
  const currentTime = format(now, 'hh:mm:ss a').toUpperCase();
  
  // Format current time for split flap display
  const [hours, minutes, secondsWithAMPM] = currentTime.split(':');
  const [seconds, ampm] = secondsWithAMPM.split(' ');
  
  // Update every second
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardContent className="p-0">
        <h2 className="text-lg font-semibold mb-4 text-white text-center">ARSENAL MATCH COUNTDOWN</h2>
        
        <div className="splitflap-display mb-6">
          <div className="grid grid-cols-4 gap-4">
            {timeUnits.map((unit) => (
              <TimeUnit 
                key={unit.label} 
                label={unit.label} 
                value={unit.value}
                prevValue={unit.prevValue}
                initialAnimation={initialLoad}
              />
            ))}
          </div>
        </div>
        
        {/* Day, Date and Time Panel */}
        <div className="splitflap-display mt-6">
          <div className="flex flex-col space-y-4">
            {/* Day of Week */}
            <div className="flex justify-center space-x-1">
              {dayOfWeek.split('').map((char, index) => (
                <SplitFlapChar 
                  key={`day-${index}`} 
                  value={char} 
                  initialAnimation={initialLoad}
                />
              ))}
            </div>
            
            {/* Date */}
            <div className="flex justify-center space-x-1">
              {currentDate.split('').map((char, index) => (
                <SplitFlapChar 
                  key={`date-${index}`} 
                  value={char} 
                  initialAnimation={initialLoad}
                />
              ))}
            </div>
            
            {/* Time */}
            <div className="flex justify-center space-x-1">
              <SplitFlapDigit 
                value={hours[0]} 
                initialAnimation={initialLoad}
                shouldAnimate={true}
              />
              <SplitFlapDigit 
                value={hours[1]} 
                initialAnimation={initialLoad}
                shouldAnimate={true}
              />
              <SplitFlapChar value=":" initialAnimation={initialLoad} />
              <SplitFlapDigit 
                value={minutes[0]} 
                initialAnimation={initialLoad}
                shouldAnimate={true}
              />
              <SplitFlapDigit 
                value={minutes[1]} 
                initialAnimation={initialLoad}
                shouldAnimate={true}
              />
              <SplitFlapChar value=":" initialAnimation={initialLoad} />
              <SplitFlapDigit 
                value={seconds[0]} 
                initialAnimation={initialLoad}
                shouldAnimate={true}
              />
              <SplitFlapDigit 
                value={seconds[1]} 
                initialAnimation={initialLoad}
                shouldAnimate={true}
              />
              <SplitFlapChar value={ampm} initialAnimation={initialLoad} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
