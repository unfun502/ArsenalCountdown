type BroadcasterInfo = { name: string; url: string };

type CompetitionBroadcasters = {
  default: BroadcasterInfo;
  premierLeague?: BroadcasterInfo;
  championsLeague?: BroadcasterInfo;
  faCup?: BroadcasterInfo;
  leagueCup?: BroadcasterInfo;
};

export const BROADCASTERS: Record<string, CompetitionBroadcasters> = {
  'GB': {
    default: { name: 'Sky Sports / TNT Sports', url: 'https://www.sky.com/watch/sports' },
    premierLeague: { name: 'Sky Sports / TNT Sports / Amazon Prime', url: 'https://www.sky.com/watch/sports' },
    championsLeague: { name: 'TNT Sports', url: 'https://www.bt.com/sport' },
    faCup: { name: 'BBC / ITV / TNT Sports', url: 'https://www.bbc.co.uk/sport/football' },
    leagueCup: { name: 'Sky Sports', url: 'https://www.sky.com/watch/sports' },
  },
  'US': {
    default: { name: 'NBC / Peacock', url: 'https://www.peacocktv.com/sports/soccer/premier-league' },
    premierLeague: { name: 'NBC / Peacock / USA Network', url: 'https://www.peacocktv.com/sports/soccer/premier-league' },
    championsLeague: { name: 'Paramount+', url: 'https://www.paramountplus.com' },
    faCup: { name: 'ESPN / ESPN+', url: 'https://www.espn.com/soccer/' },
    leagueCup: { name: 'Paramount+', url: 'https://www.paramountplus.com' },
  },
  'CA': {
    default: { name: 'FuboTV', url: 'https://www.fubo.tv/welcome/channels' },
    premierLeague: { name: 'FuboTV', url: 'https://www.fubo.tv/welcome/channels' },
    championsLeague: { name: 'DAZN', url: 'https://www.dazn.com/en-CA' },
    faCup: { name: 'Sportsnet', url: 'https://www.sportsnet.ca' },
    leagueCup: { name: 'DAZN', url: 'https://www.dazn.com/en-CA' },
  },
  'AU': {
    default: { name: 'Optus Sport', url: 'https://www.optus.com.au/sport/optus-sport' },
    premierLeague: { name: 'Optus Sport', url: 'https://www.optus.com.au/sport/optus-sport' },
    championsLeague: { name: 'Stan Sport', url: 'https://www.stan.com.au/sport' },
    faCup: { name: 'Stan Sport', url: 'https://www.stan.com.au/sport' },
    leagueCup: { name: 'Optus Sport', url: 'https://www.optus.com.au/sport/optus-sport' },
  },
  'DE': {
    default: { name: 'Sky Deutschland', url: 'https://www.sky.de/fussball/premier-league' },
    premierLeague: { name: 'Sky Deutschland', url: 'https://www.sky.de/fussball/premier-league' },
    championsLeague: { name: 'DAZN / Amazon Prime / ZDF', url: 'https://www.dazn.com/de-DE' },
    faCup: { name: 'DAZN', url: 'https://www.dazn.com/de-DE' },
    leagueCup: { name: 'Sky Deutschland', url: 'https://www.sky.de' },
  },
  'FR': {
    default: { name: 'Canal+', url: 'https://www.canalplus.com/sport/football' },
    premierLeague: { name: 'Canal+', url: 'https://www.canalplus.com/sport/football' },
    championsLeague: { name: 'Canal+', url: 'https://www.canalplus.com/sport/football' },
    faCup: { name: 'Canal+', url: 'https://www.canalplus.com/sport/football' },
    leagueCup: { name: 'Canal+', url: 'https://www.canalplus.com/sport/football' },
  },
  'ES': {
    default: { name: 'DAZN', url: 'https://www.dazn.com/es-ES/sport/football' },
    premierLeague: { name: 'DAZN', url: 'https://www.dazn.com/es-ES/sport/football' },
    championsLeague: { name: 'Movistar Plus+', url: 'https://www.movistarplus.es' },
    faCup: { name: 'DAZN', url: 'https://www.dazn.com/es-ES/sport/football' },
    leagueCup: { name: 'DAZN', url: 'https://www.dazn.com/es-ES/sport/football' },
  },
  'IT': {
    default: { name: 'Sky Italia', url: 'https://sport.sky.it/calcio/premier-league' },
    premierLeague: { name: 'Sky Italia', url: 'https://sport.sky.it/calcio/premier-league' },
    championsLeague: { name: 'Sky Italia / Amazon Prime', url: 'https://sport.sky.it' },
    faCup: { name: 'Sky Italia', url: 'https://sport.sky.it' },
    leagueCup: { name: 'Sky Italia', url: 'https://sport.sky.it' },
  },
  'NL': {
    default: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
    premierLeague: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
    championsLeague: { name: 'Ziggo Sport', url: 'https://www.ziggosport.nl' },
    faCup: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
    leagueCup: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
  },
  'IN': {
    default: { name: 'Star Sports / Hotstar', url: 'https://www.hotstar.com/sports/football' },
    premierLeague: { name: 'Star Sports / Hotstar', url: 'https://www.hotstar.com/sports/football' },
    championsLeague: { name: 'Sony LIV / Sony Sports', url: 'https://www.sonyliv.com' },
    faCup: { name: 'Sony LIV', url: 'https://www.sonyliv.com' },
    leagueCup: { name: 'Star Sports / Hotstar', url: 'https://www.hotstar.com/sports/football' },
  },
  'BR': {
    default: { name: 'ESPN', url: 'https://www.espn.com.br' },
    premierLeague: { name: 'ESPN', url: 'https://www.espn.com.br' },
    championsLeague: { name: 'HBO Max / TNT Sports', url: 'https://play.max.com' },
    faCup: { name: 'ESPN', url: 'https://www.espn.com.br' },
    leagueCup: { name: 'ESPN', url: 'https://www.espn.com.br' },
  },
  'IE': {
    default: { name: 'Sky Sports / TNT Sports', url: 'https://www.sky.com/watch/sports' },
    premierLeague: { name: 'Sky Sports / TNT Sports / Premier Sports', url: 'https://www.sky.com/watch/sports' },
    championsLeague: { name: 'TNT Sports', url: 'https://www.bt.com/sport' },
    faCup: { name: 'BBC / ITV / TNT Sports', url: 'https://www.bbc.co.uk/sport/football' },
    leagueCup: { name: 'Sky Sports', url: 'https://www.sky.com/watch/sports' },
  },
};

export type CompetitionKey = 'premierLeague' | 'championsLeague' | 'faCup' | 'leagueCup';

export function getCompetitionKey(competitionName: string): CompetitionKey | null {
  const name = competitionName.toLowerCase();
  if (name.includes('premier league')) return 'premierLeague';
  if (name.includes('champions league') || name.includes('uefa champions')) return 'championsLeague';
  if (name.includes('fa cup')) return 'faCup';
  if (name.includes('league cup') || name.includes('efl cup') || name.includes('carabao')) return 'leagueCup';
  return null;
}

export function getBroadcaster(countryCode: string, competitionName: string): BroadcasterInfo | null {
  const country = BROADCASTERS[countryCode];
  if (!country) return null;

  const compKey = getCompetitionKey(competitionName);
  if (compKey && country[compKey]) return country[compKey]!;
  return country.default;
}

export const ARSENAL_TEAM_ID = 57;
export const ARSENAL_PRIMARY_COLOR = '#FF0000';
export const ARSENAL_SECONDARY_COLOR = '#FFFFFF';
