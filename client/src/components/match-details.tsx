import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Match } from "@shared/schema";
import { BROADCASTERS } from "@shared/constants";
import { Separator } from "@/components/ui/separator";
import { TvIcon, MapPinIcon, TrophyIcon } from "lucide-react";

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

  const broadcaster = userCountry ? BROADCASTERS[userCountry] : "Check local listings";

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">Match Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-xl font-semibold">
            {match.homeTeam} vs {match.awayTeam}
          </div>
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
            <span>Watch on: {broadcaster}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
