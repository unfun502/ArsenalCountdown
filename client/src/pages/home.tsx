import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Match } from "@shared/schema";
import Countdown from "@/components/countdown";
import MatchDetails from "@/components/match-details";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl md:text-4xl font-bold text-black mb-6">
        Arsenal <span className="text-[#FF0000]">Match Countdown</span>
      </h1>
      
      {isLoading ? (
        <div className="space-y-8 w-full max-w-2xl">
          <Skeleton className="h-32 w-full bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      ) : match ? (
        <div className="space-y-8 w-full max-w-2xl">
          <Countdown kickoff={new Date(match.kickoff)} match={match} />
          <MatchDetails match={match} />
          
          <div className="text-center text-white/50 text-sm mt-8">
            <p>© {new Date().getFullYear()} Arsenal Match Countdown</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
