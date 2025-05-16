
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
const SplitFlapDigit = ({ value, initialAnimation = false }: { value: string, initialAnimation?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animating, setAnimating] = useState(initialAnimation);
  const prevValueRef = useRef(value);
  const animationFramesRef = useRef<number>(0);
  const requestRef = useRef<number>();
  
  useEffect(() => {
    // Function to cycle through numbers when animating
    const cycleNumbers = () => {
      if (animationFramesRef.current < 10) {
        // Cycle through numbers 0-9 rapidly
        const randomDigit = Math.floor(Math.random() * 10).toString();
        setDisplayValue(randomDigit);
        animationFramesRef.current++;
        requestRef.current = requestAnimationFrame(cycleNumbers);
      } else {
        // End animation and show final value
        setDisplayValue(value);
        setAnimating(false);
        animationFramesRef.current = 0;
      }
    };

    // Start animation when value changes
    if (prevValueRef.current !== value && !initialAnimation) {
      setAnimating(true);
      animationFramesRef.current = 0;
      requestRef.current = requestAnimationFrame(cycleNumbers);
      prevValueRef.current = value;
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [value, initialAnimation]);

  return (
    <div className="splitflap-cell">
      <div className="splitflap-dot left"></div>
      <div className="splitflap-dot right"></div>
      <div className={`splitflap-number ${initialAnimation ? 'splitflap-init-animate' : ''} ${animating ? 'number-cycling' : ''}`}>
        {displayValue}
      </div>
    </div>
  );
};

// Component to display a time unit (days, hours, etc.) with two digits
const TimeUnit = ({ label, value, initialAnimation }: { label: string, value: number, initialAnimation: boolean }) => {
  const displayValue = value.toString().padStart(2, '0');
  const digit1 = displayValue[0];
  const digit2 = displayValue[1];
  
  return (
    <div className="splitflap-unit">
      <div className="splitflap-digits">
        <SplitFlapDigit value={digit1} initialAnimation={initialAnimation} />
        <SplitFlapDigit value={digit2} initialAnimation={initialAnimation} />
      </div>
      <div className="splitflap-unit-label">{label}</div>
    </div>
  );
};

export default function Countdown({ kickoff }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
      
      // Update random digits every 100ms for a spinning effect
      const interval = setInterval(generateRandomDigits, 100);
      
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
    { label: "DAYS", value: displayValues.days },
    { label: "HOURS", value: displayValues.hours },
    { label: "MINS", value: displayValues.minutes },
    { label: "SECS", value: displayValues.seconds }
  ];

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardContent className="p-0">
        <h2 className="text-lg font-semibold mb-4 text-white text-center">ARSENAL MATCH COUNTDOWN</h2>
        
        <div className="splitflap-display">
          <div className="grid grid-cols-4 gap-4">
            {timeUnits.map((unit) => (
              <TimeUnit 
                key={unit.label} 
                label={unit.label} 
                value={unit.value}
                initialAnimation={initialLoad}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
