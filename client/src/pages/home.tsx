import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Match } from "@shared/schema";
import Countdown from "@/components/countdown";
import MatchDetails from "@/components/match-details";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  
  const { data: match, isLoading, error } = useQuery<Match>({
    queryKey: ['/api/next-match'],
    retry: false,
    onError: (err) => {
      toast({
        title: "Error",
        description: "Failed to load match data. Please try again later.",
        variant: "destructive"
      });
    }
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Unable to Load Match Data</h1>
          <p className="text-muted-foreground">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {isLoading ? (
        <div className="space-y-8 w-full max-w-2xl">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : match ? (
        <div className="space-y-8 w-full max-w-2xl">
          <Countdown kickoff={new Date(match.kickoff)} />
          <MatchDetails match={match} />
        </div>
      ) : null}
    </div>
  );
}
