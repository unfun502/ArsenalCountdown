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
    staleTime: 30 * 60 * 1000, // 30 minutes - cache longer to avoid rate limits
    refetchInterval: false, // Don't auto-refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (no matches found) - this is expected during off-season
      if (error?.response?.status === 404) {
        return false;
      }
      // Don't retry on 429 (rate limit) - wait for cache to expire
      if (error?.response?.status === 429) {
        return false;
      }
      // Retry up to 2 times for other errors with longer delays
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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

  // Handle case when no matches are found (legitimate off-season)
  const errorResponse = error as any;
  if (errorResponse?.response?.status === 404) {
    const responseData = errorResponse?.response?.data;
    if (responseData?.seasonStatus === 'off-season') {
      return (
        <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-[#FF0000] mb-4">
                ARSENAL
              </h1>
              <div className="text-white text-xl mb-4">
                Season Complete
              </div>
              <p className="text-gray-400 text-sm">
                No upcoming fixtures scheduled. Check back during the new season.
              </p>
            </div>
            
            <div className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Arsenal Football Club
            </div>
          </div>
        </div>
      );
    }
  }

  // Handle genuine API errors (connection issues, server errors, etc.)
  if (error) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-[#FF0000] mb-4">
              ARSENAL
            </h1>
            <div className="text-red-400 text-xl mb-4">
              Connection Error
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Unable to connect to match data service. Please check your connection and try again.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-[#FF0000] text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              Try Again
            </button>
          </div>
          
          <div className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Arsenal Football Club
          </div>
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
          
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="text-white/50 text-sm">
              © {new Date().getFullYear()} Arsenal Match Countdown
            </div>
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
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/10 text-sm px-2"
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              Add to Calendar
            </Button>
            <a href="https://github.com/unfun502" target="_blank" rel="noopener noreferrer">
              <img src="/images/otter-logo.png" alt="Portfolio" className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
