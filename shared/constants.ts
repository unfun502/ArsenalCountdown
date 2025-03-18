// Map of country codes to broadcaster information
export const BROADCASTERS: Record<string, { name: string, url: string }> = {
  'GB': { 
    name: 'Sky Sports / TNT Sports',
    url: 'https://www.sky.com/watch/sports'
  },
  'US': { 
    name: 'NBC / Peacock',
    url: 'https://www.peacocktv.com/sports/soccer/premier-league'
  },
  'CA': { 
    name: 'FuboTV',
    url: 'https://www.fubo.tv/welcome/channels'
  },
  'AU': { 
    name: 'Optus Sport',
    url: 'https://www.optus.com.au/sport/optus-sport'
  },
  'DE': { 
    name: 'Sky Deutschland',
    url: 'https://www.sky.de/fussball/premier-league'
  },
  'FR': { 
    name: 'Canal+',
    url: 'https://www.canalplus.com/sport/football'
  },
  'ES': { 
    name: 'DAZN',
    url: 'https://www.dazn.com/es-ES/sport/football'
  },
  'IT': { 
    name: 'Sky Italia',
    url: 'https://sport.sky.it/calcio/premier-league'
  },
  'NL': { 
    name: 'Viaplay',
    url: 'https://viaplay.nl/sport/voetbal'
  },
  'IN': { 
    name: 'Star Sports / Hotstar',
    url: 'https://www.hotstar.com/sports/football'
  }
};

export const ARSENAL_TEAM_ID = 57;
export const ARSENAL_PRIMARY_COLOR = '#FF0000';
export const ARSENAL_SECONDARY_COLOR = '#FFFFFF';