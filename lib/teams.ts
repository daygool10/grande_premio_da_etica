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

export interface Team {
  id: string;
  label: string;
  color: string;
  livery: {
    image?: string;
    body: string;
    accent: string;
    detail: string;
  };
  gridSlot: number;
}

export const TEAMS: readonly Team[] = [
  { id: 'mclaren', label: 'McLaren', color: '#FF8000', livery: { image: mclarenCar, body: '#ff8000', accent: '#15151e', detail: '#47c7fc' }, gridSlot: 1 },
  { id: 'ferrari', label: 'Ferrari', color: '#E80020', livery: { image: ferrariCar, body: '#e80020', accent: '#15151e', detail: '#fff200' }, gridSlot: 2 },
  { id: 'red-bull', label: 'Red Bull', color: '#3671C6', livery: { image: redBullCar, body: '#172c65', accent: '#e11d2e', detail: '#f5d442' }, gridSlot: 3 },
  { id: 'mercedes', label: 'Mercedes', color: '#27F4D2', livery: { image: mercedesCar, body: '#111820', accent: '#27f4d2', detail: '#d9e1e8' }, gridSlot: 4 },
  { id: 'aston-martin', label: 'Aston Martin', color: '#229971', livery: { image: astonMartinCar, body: '#00665e', accent: '#b6ff00', detail: '#d6e8dc' }, gridSlot: 5 },
  { id: 'williams', label: 'Williams', color: '#64C4FF', livery: { image: williamsCar, body: '#0072ce', accent: '#101820', detail: '#f5f5f5' }, gridSlot: 6 },
  { id: 'visa-cash-app', label: 'Visa Cash App', color: '#6692FF', livery: { image: visaCashAppCar, body: '#183b85', accent: '#101820', detail: '#f5f5f5' }, gridSlot: 7 },
  { id: 'alpine', label: 'Alpine', color: '#FF87BC', livery: { image: alpineCar, body: '#1478ff', accent: '#ff87bc', detail: '#f5f5f5' }, gridSlot: 8 },
  { id: 'audi', label: 'Audi', color: '#C0C0C0', livery: { image: audiCar, body: '#c0c0c0', accent: '#20242b', detail: '#bb0a30' }, gridSlot: 9 },
  { id: 'cadillac', label: 'Cadillac', color: '#00594F', livery: { image: cadillacCar, body: '#161b1d', accent: '#b6a36a', detail: '#f4f0e6' }, gridSlot: 10 },
  { id: 'haas', label: 'Haas', color: '#B6BABD', livery: { image: haasCar, body: '#b6babd', accent: '#15151e', detail: '#e10600' }, gridSlot: 11 },
  { id: 'lotus', label: 'Lotus', color: '#C7A34B', livery: { image: cadillacCar, body: '#101820', accent: '#C7A34B', detail: '#F3EAD0' }, gridSlot: 12 },
  { id: 'brabham', label: 'Brabham', color: '#0B6E3B', livery: { image: astonMartinCar, body: '#0B6E3B', accent: '#F5F5F5', detail: '#E8B800' }, gridSlot: 13 },
  { id: 'tyrrell', label: 'Tyrrell', color: '#0D254C', livery: { image: williamsCar, body: '#0D254C', accent: '#F5F5F5', detail: '#557995' }, gridSlot: 14 },
  { id: 'benetton', label: 'Benetton', color: '#009A44', livery: { image: alpineCar, body: '#009A44', accent: '#F5F5F5', detail: '#1B3C8C' }, gridSlot: 15 },
  { id: 'jordan', label: 'Jordan', color: '#FFD700', livery: { image: visaCashAppCar, body: '#FFD700', accent: '#101820', detail: '#101820' }, gridSlot: 16 },
  { id: 'sauber', label: 'Sauber', color: '#9B0000', livery: { image: audiCar, body: '#9B0000', accent: '#F5F5F5', detail: '#1C1C1C' }, gridSlot: 17 },
  { id: 'renault', label: 'Renault', color: '#FFF500', livery: { image: redBullCar, body: '#2A2A6E', accent: '#FFF500', detail: '#F5F5F5' }, gridSlot: 18 },
  { id: 'toro-rosso', label: 'Toro Rosso', color: '#469BFF', livery: { image: mercedesCar, body: '#2B4562', accent: '#E3272E', detail: '#F5F5F5' }, gridSlot: 19 },
  { id: 'brawn', label: 'Brawn', color: '#C6E000', livery: { image: haasCar, body: '#F2F3F5', accent: '#1C1C1C', detail: '#C6E000' }, gridSlot: 20 },
] as const;

export const F1_TEAMS: readonly string[] = TEAMS.map((team) => team.label);

export const TEAM_COLORS: Record<string, string> = Object.fromEntries(
  TEAMS.map((team) => [team.label, team.color]),
);

export const TEAM_CAR_LIVERIES: Record<string, Team['livery']> = Object.fromEntries(
  TEAMS.map((team) => [team.label, team.livery]),
);

export const TEAM_COUNT = TEAMS.length;
export const MAX_TEAMS = TEAM_COUNT;

export const getTeamByLabel = (label: string): Team | undefined =>
  TEAMS.find((team) => team.label === label);

export const getTeamColor = (label: string, fallback = '#d1d5db'): string =>
  getTeamByLabel(label)?.color ?? fallback;
