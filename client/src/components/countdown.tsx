
import { useEffect, useState } from "react";
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

const SplitFlapNumber = ({ value }: { value: number }) => {
  const [flipping, setFlipping] = useState(false);
  const displayValue = value.toString().padStart(2, '0');

  useEffect(() => {
    setFlipping(true);
    const timer = setTimeout(() => setFlipping(false), 600);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="split-flap w-16 md:w-20">
      <div className={`split-flap-top ${flipping ? 'flip' : ''}`}>
        <span className="text-4xl font-bold text-[#FF0000]">{displayValue}</span>
      </div>
      <div className={`split-flap-bottom ${flipping ? 'flop' : ''}`}>
        <span className="text-4xl font-bold text-[#FF0000]">{displayValue}</span>
      </div>
    </div>
  );
};

export default function Countdown({ kickoff }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  return (
    <Card className="bg-white border border-gray-200 shadow-md">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-black">Next Match Kicks Off In:</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          {Object.entries(timeLeft).map(([unit, value]) => (
            <div key={unit} className="flex flex-col items-center">
              <SplitFlapNumber value={value} />
              <span className="text-sm text-gray-600 capitalize mt-2">{unit}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
