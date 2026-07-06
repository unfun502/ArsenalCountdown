type BroadcasterInfo = { name: string; url: string };

// `null` means "verified: no broadcaster holds these rights in this country" —
// the UI then shows "check local listings" instead of guessing.
type CompetitionBroadcasters = {
  default: BroadcasterInfo;
  premierLeague?: BroadcasterInfo | null;
  championsLeague?: BroadcasterInfo | null;
  faCup?: BroadcasterInfo | null;
  leagueCup?: BroadcasterInfo | null;
};

// Rights verified for the 2026-27 season (July 2026). Known upcoming shifts:
// UK/DE Champions League moves to Paramount+/Prime from 2027-28, and Viaplay NL
// is being sold to DPG Media (likely rebrands to Videoland mid-season).
export const BROADCASTERS: Record<string, CompetitionBroadcasters> = {
  'GB': {
    default: { name: 'Sky Sports / TNT Sports', url: 'https://www.sky.com/watch/sports' },
    premierLeague: { name: 'Sky Sports / TNT Sports', url: 'https://www.skysports.com/watch/sky-sports-premier-league' },
    championsLeague: { name: 'TNT Sports', url: 'https://www.tnt-sports.co.uk' },
    faCup: { name: 'BBC / TNT Sports', url: 'https://www.bbc.co.uk/sport/football' },
    leagueCup: { name: 'Sky Sports / ITV', url: 'https://www.sky.com/watch/sports' },
  },
  'US': {
    default: { name: 'NBC/PCOCK', url: 'https://www.peacocktv.com/sports/soccer/premier-league' },
    premierLeague: { name: 'NBC/PCOCK', url: 'https://www.peacocktv.com/sports/soccer/premier-league' },
    championsLeague: { name: 'PARAMOUNT+', url: 'https://www.paramountplus.com' },
    faCup: { name: 'ESPN+', url: 'https://www.espn.com/soccer/' },
    leagueCup: { name: 'PARAMOUNT+', url: 'https://www.paramountplus.com' },
  },
  'CA': {
    default: { name: 'Fubo', url: 'https://www.fubo.tv/welcome/channels' },
    premierLeague: { name: 'Fubo', url: 'https://www.fubo.tv/welcome/channels' },
    championsLeague: { name: 'DAZN', url: 'https://www.dazn.com/en-CA' },
    faCup: { name: 'Sportsnet+', url: 'https://www.sportsnet.ca/plus/' },
    leagueCup: { name: 'DAZN', url: 'https://www.dazn.com/en-CA' },
  },
  'AU': {
    default: { name: 'Stan Sport', url: 'https://www.stan.com.au/sport' },
    premierLeague: { name: 'Stan Sport', url: 'https://www.stan.com.au/sport' },
    championsLeague: { name: 'Stan Sport', url: 'https://www.stan.com.au/sport' },
    faCup: { name: 'Stan Sport', url: 'https://www.stan.com.au/sport' },
    leagueCup: { name: 'beIN Sports', url: 'https://www.beinsports.com/en-au/' },
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
    faCup: { name: 'beIN Sports', url: 'https://www.beinsports.com/fr-fr/' },
    leagueCup: { name: 'beIN Sports', url: 'https://www.beinsports.com/fr-fr/' },
  },
  'ES': {
    default: { name: 'DAZN', url: 'https://www.dazn.com/es-ES/sport/football' },
    premierLeague: { name: 'DAZN', url: 'https://www.dazn.com/es-ES/sport/football' },
    championsLeague: { name: 'Movistar Plus+', url: 'https://www.movistarplus.es' },
    faCup: { name: 'Movistar Plus+', url: 'https://www.movistarplus.es' },
    leagueCup: null, // no Spanish broadcaster holds 2026-27 Carabao Cup rights
  },
  'IT': {
    default: { name: 'Sky Italia', url: 'https://sport.sky.it/calcio/premier-league' },
    premierLeague: { name: 'Sky Italia', url: 'https://sport.sky.it/calcio/premier-league' },
    championsLeague: { name: 'Sky Italia / Amazon Prime', url: 'https://sport.sky.it' },
    faCup: { name: 'DAZN', url: 'https://www.dazn.com/it-IT' },
    leagueCup: null, // no Italian broadcaster holds 2026-27 Carabao Cup rights
  },
  'NL': {
    default: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
    premierLeague: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
    championsLeague: { name: 'Ziggo Sport', url: 'https://www.ziggosport.nl' },
    faCup: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
    leagueCup: { name: 'Viaplay', url: 'https://viaplay.nl/sport/voetbal' },
  },
  'IN': {
    default: { name: 'JioHotstar / Star Sports', url: 'https://www.jiohotstar.com' },
    premierLeague: { name: 'JioHotstar / Star Sports', url: 'https://www.jiohotstar.com' },
    championsLeague: { name: 'Sony LIV / Sony Sports', url: 'https://www.sonyliv.com' },
    faCup: { name: 'Sony LIV', url: 'https://www.sonyliv.com' },
    leagueCup: null, // no Indian broadcaster holds 2026-27 Carabao Cup rights
  },
  'BR': {
    default: { name: 'ESPN / Disney+', url: 'https://www.disneyplus.com/pt-br' },
    premierLeague: { name: 'ESPN / Disney+', url: 'https://www.disneyplus.com/pt-br' },
    championsLeague: { name: 'HBO Max / TNT Sports', url: 'https://www.max.com/br' },
    faCup: { name: 'ESPN / Disney+', url: 'https://www.disneyplus.com/pt-br' },
    leagueCup: { name: 'ESPN / Disney+', url: 'https://www.disneyplus.com/pt-br' },
  },
  'IE': {
    default: { name: 'Sky Sports / TNT Sports', url: 'https://www.sky.com/watch/sports' },
    premierLeague: { name: 'Sky Sports / TNT Sports / Premier Sports', url: 'https://www.sky.com/watch/sports' },
    championsLeague: { name: 'Premier Sports / RTÉ / Virgin Media', url: 'https://premiersportsireland.com' },
    faCup: { name: 'Premier Sports', url: 'https://premiersportsireland.com' },
    leagueCup: { name: 'Sky Sports', url: 'https://www.sky.com/watch/sports' },
  },
};

export type CompetitionKey = 'premierLeague' | 'championsLeague' | 'faCup' | 'leagueCup';

export function getCompetitionKey(competitionName: string): CompetitionKey | null {
  const name = competitionName.toLowerCase();
  if (name.includes('premier league')) return 'premierLeague';
  if (name.includes('champions league') || name.includes('uefa champions')) return 'championsLeague';
  if (name.includes('europa') || name.includes('conference league') || name.includes('uefa')) return 'championsLeague';
  if (name.includes('fa cup')) return 'faCup';
  if (name.includes('league cup') || name.includes('efl cup') || name.includes('carabao')) return 'leagueCup';
  return null;
}

export function getBroadcaster(countryCode: string, competitionName: string): BroadcasterInfo | null {
  const country = BROADCASTERS[countryCode];
  if (!country) return null;

  const compKey = getCompetitionKey(competitionName);
  // Unknown competition (friendlies, Club World Cup, ...): claiming the PL
  // broadcaster would likely be wrong — let the UI show "check local listings".
  if (!compKey) return null;
  const entry = country[compKey];
  // Explicit null = verified "nobody broadcasts this here"; undefined = no data.
  if (entry === null) return null;
  return entry ?? country.default;
}

export const ARSENAL_TEAM_ID = 57;
export const ARSENAL_PRIMARY_COLOR = '#FF0000';
export const ARSENAL_SECONDARY_COLOR = '#FFFFFF';
