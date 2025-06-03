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
    queryKey: ['/api/next-match'],
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 404 (no matches found)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    }
  });
  
  useEffect(() => {
    if (error) {
      const errorResponse = error as any;
      if (errorResponse?.response?.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to load match data. Please try again later.",
          variant: "destructive"
        });
      }
    }
  }, [error, toast]);

  // Handle case when no matches are found (404 error)
  const errorResponse = error as any;
  if (errorResponse?.response?.status === 404) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Arsenal FC</h1>
            <div className="text-6xl mb-4">⚽</div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Season Complete</h2>
          <p className="text-white/70 mb-6">
            No upcoming matches scheduled at this time. The current season may have ended or there might be a break in fixtures.
          </p>
          
          <div className="space-y-4">
            <p className="text-white/50 text-sm">
              Check back later for updates on the next season's fixtures.
            </p>
            
            <div className="text-white/50 text-sm mt-8">
              <p>© {new Date().getFullYear()} Arsenal Match Countdown</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Unable to Load Match Data</h1>
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
            

            
            <div className="text-white/50 text-sm mt-4">
              <p>© {new Date().getFullYear()} Arsenal Match Countdown</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
