
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
  const [animating, setAnimating] = useState(initialAnimation);
  const prevValueRef = useRef(value);
  
  useEffect(() => {
    // Animate when value changes
    if (prevValueRef.current !== value) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className={`splitflap-cell ${initialAnimation ? 'splitflap-init-animate' : ''}`}>
      <div className="splitflap-dot left"></div>
      <div className="splitflap-dot right"></div>
      <div className={`splitflap-number ${animating ? 'flip-enter-active' : ''}`}>
        {value}
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
  
  useEffect(() => {
    // Initial animation effect
    if (initialLoad) {
      setTimeout(() => {
        setInitialLoad(false);
      }, 2000); // Run initial animation for 2 seconds
    }
    
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
  }, [kickoff, initialLoad]);

  const timeUnits = [
    { label: "DAYS", value: timeLeft.days },
    { label: "HOURS", value: timeLeft.hours },
    { label: "MINS", value: timeLeft.minutes },
    { label: "SECS", value: timeLeft.seconds }
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
