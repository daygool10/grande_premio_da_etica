interface TeamCarLivery {
  body: string;
  accent: string;
  detail: string;
}

export const TEAM_CAR_LIVERIES: Record<string, TeamCarLivery> = {
  McLaren: { body: '#ff8000', accent: '#15151e', detail: '#47c7fc' },
  Ferrari: { body: '#e80020', accent: '#15151e', detail: '#fff200' },
  'Red Bull': { body: '#172c65', accent: '#e11d2e', detail: '#f5d442' },
  Mercedes: { body: '#111820', accent: '#27f4d2', detail: '#d9e1e8' },
  'Aston Martin': { body: '#00665e', accent: '#b6ff00', detail: '#d6e8dc' },
  Williams: { body: '#0072ce', accent: '#101820', detail: '#f5f5f5' },
  'Visa Cash App': { body: '#183b85', accent: '#101820', detail: '#f5f5f5' },
  Alpine: { body: '#1478ff', accent: '#ff87bc', detail: '#f5f5f5' },
  Audi: { body: '#c0c0c0', accent: '#20242b', detail: '#bb0a30' },
  Cadillac: { body: '#161b1d', accent: '#b6a36a', detail: '#f4f0e6' },
  Haas: { body: '#b6babd', accent: '#15151e', detail: '#e10600' },
};
