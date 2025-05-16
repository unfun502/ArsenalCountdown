import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Match } from "@shared/schema";
import Countdown from "@/components/countdown";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { atcb_action } from "add-to-calendar-button";

export default function Home() {
  const { toast } = useToast();
  
  const { data: match, isLoading, error } = useQuery<Match>({
    queryKey: ['/api/next-match']
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load match data. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  if (error) {
    return (
      <div className="min-h-screen bg-codepen-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-codepen-purple mb-2">Unable to Load Match Data</h1>
          <p className="text-white/70">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex flex-col items-center justify-center p-6">
      
      {isLoading ? (
        <div className="space-y-8 w-full max-w-2xl">
          <Skeleton className="h-32 w-full bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      ) : match ? (
        <div className="space-y-8 w-full max-w-2xl">
          <Countdown kickoff={new Date(match.kickoff)} match={match} />
          
          <div className="text-center mt-8">
            <Button
              onClick={() => atcb_action({
                name: `${match.homeTeam} vs ${match.awayTeam}`,
                description: `${match.competition} match at ${match.venue}`,
                startDate: format(new Date(match.kickoff), 'yyyy-MM-dd'),
                startTime: format(new Date(match.kickoff), 'HH:mm'),
                endTime: format(new Date(match.kickoff).setHours(new Date(match.kickoff).getHours() + 2), 'HH:mm'),
                location: match.venue,
                options: ['Google', 'Apple', 'Microsoft365', 'Outlook.com', 'iCal'],
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              })}
              className="bg-codepen-black border border-white/20 text-white hover:bg-white/10 mb-4"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>
            
            {/* Add audio element directly to the page for testing */}
            <div className="mt-4">
              <audio controls src="/sounds/splitflap-click.mp3" id="clickSound" preload="auto"></audio>
            </div>
            
            <div className="text-white/50 text-sm mt-4">
              <p>© {new Date().getFullYear()} Arsenal Match Countdown</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
