import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInSeconds, formatDuration } from "date-fns";

interface CountdownProps {
  kickoff: Date;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function Countdown({ kickoff }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diffInSeconds = differenceInSeconds(kickoff, new Date());
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

  return (
    <Card className="bg-codepen-black border-none shadow-xl">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Next Match Kicks Off In:</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          {Object.entries(timeLeft).map(([unit, value], index) => {
            // Alternate accent colors for each unit
            const accentColors = ['text-codepen-teal', 'text-codepen-blue', 'text-codepen-purple', 'text-codepen-teal'];
            const accentColor = accentColors[index];
            
            return (
              <div key={unit} className="flex flex-col">
                <span className={`text-4xl font-bold font-mono ${accentColor}`} style={{ fontFamily: 'JetBrains Mono' }}>
                  {value.toString().padStart(2, '0')}
                </span>
                <span className="text-sm text-white/70 capitalize mt-1">{unit}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
