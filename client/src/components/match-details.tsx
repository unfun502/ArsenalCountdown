import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Match } from "@shared/schema";
import { BROADCASTERS } from "@shared/constants";
import { Separator } from "@/components/ui/separator";
import { TvIcon, MapPinIcon, TrophyIcon, ExternalLinkIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { atcb_action } from "add-to-calendar-button";
import NotificationToggle from "./notification-toggle";

interface MatchDetailsProps {
  match: Match;
}

export default function MatchDetails({ match }: MatchDetailsProps) {
  const [userCountry, setUserCountry] = useState<string>("");

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => setUserCountry(data.country_code))
      .catch(err => console.error("Failed to get user location:", err));
  }, []);

  const broadcaster = userCountry && BROADCASTERS[userCountry];
  const broadcasterInfo = broadcaster 
    ? (
      <a 
        href={broadcaster.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        Watch on {broadcaster.name} <ExternalLinkIcon className="h-4 w-4" />
      </a>
    ) 
    : "Check local listings";

  const kickoffTime = format(new Date(match.kickoff), 'h:mm a');
  const kickoffDate = format(new Date(match.kickoff), 'MMM d');

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">Match Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="text-xl font-semibold">
            {match.homeTeam} vs {match.awayTeam}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="h-4 w-4" />
            <span>{kickoffDate} at {kickoffTime}</span>
          </div>
          <NotificationToggle matchTime={new Date(match.kickoff)} />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-primary" />
            <span>{match.competition}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-primary" />
            <span>{match.venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <TvIcon className="h-5 w-5 text-primary" />
            {broadcasterInfo}
          </div>

          <button
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
            className="flex items-center gap-2 text-primary hover:underline"
          >
            Add to Calendar
          </button>
        </div>
      </CardContent>
    </Card>
  );
}