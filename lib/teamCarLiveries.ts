import alpineCar from '../cars/alpine.png';
import astonMartinCar from '../cars/aston.png';
import audiCar from '../cars/audi.png';
import cadillacCar from '../cars/cadillac.png';
import ferrariCar from '../cars/ferrari.png';
import haasCar from '../cars/haas.png';
import mclarenCar from '../cars/mclaren.png';
import mercedesCar from '../cars/mercedes.png';
import redBullCar from '../cars/redbull.png';
import visaCashAppCar from '../cars/visa cash app.png';
import williamsCar from '../cars/williams.png';

interface TeamCarLivery {
  image: string;
}

export const TEAM_CAR_LIVERIES: Record<string, TeamCarLivery> = {
  McLaren: { image: mclarenCar },
  Ferrari: { image: ferrariCar },
  'Red Bull': { image: redBullCar },
  Mercedes: { image: mercedesCar },
  'Aston Martin': { image: astonMartinCar },
  Williams: { image: williamsCar },
  'Visa Cash App': { image: visaCashAppCar },
  Alpine: { image: alpineCar },
  Audi: { image: audiCar },
  Cadillac: { image: cadillacCar },
  Haas: { image: haasCar },
};
