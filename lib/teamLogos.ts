import { assetPath } from './assetPath';

// As logos sao quase todas brancas (as de raster tem media #ffffff): o chip da equipe
// precisa ser ESCURO, senao a marca desaparece. Mercedes e Lotus ficaram invisiveis com chip
// claro (#E0E4E7 e #C7A34B) e voltaram para preto. Se trocar um chip, confira o contraste
// contra a cor da logo antes de commitar.
export const TEAM_LOGOS: Record<string, string> = {
  McLaren: assetPath('/team-logos/mclaren.png'),
  Ferrari: assetPath('/team-logos/ferrari.png'),
  'Red Bull': assetPath('/team-logos/red-bull.png'),
  Mercedes: assetPath('/team-logos/mercedes.png'),
  'Aston Martin': assetPath('/team-logos/aston-martin.png'),
  Williams: assetPath('/team-logos/williams.png'),
  'Visa Cash App': assetPath('/team-logos/visa-cash-app-rb.png'),
  Alpine: assetPath('/team-logos/alpine.png'),
  Audi: assetPath('/team-logos/audi.svg'),
  Cadillac: assetPath('/team-logos/cadillac.svg'),
  Haas: assetPath('/team-logos/haas.png'),
  'Lotus': assetPath('/team-logos/lotus.png'),
  'Sauber': assetPath('/team-logos/sauber.png'),
  'Renault': assetPath('/team-logos/renault.svg'),
  'Brawn': assetPath('/team-logos/brawn.svg'),
};
