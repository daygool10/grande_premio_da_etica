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
  { id: 'lotus', label: 'Lotus', color: '#B8860B', livery: { image: cadillacCar, body: '#101820', accent: '#b8860b', detail: '#f3ead0' }, gridSlot: 12 },
  { id: 'brabham', label: 'Brabham', color: '#187A3C', livery: { image: astonMartinCar, body: '#187a3c', accent: '#f5f5f5', detail: '#e8b800' }, gridSlot: 13 },
  { id: 'tyrrell', label: 'Tyrrell', color: '#25A4C9', livery: { image: williamsCar, body: '#25a4c9', accent: '#f5f5f5', detail: '#0b1d3a' }, gridSlot: 14 },
  { id: 'benetton', label: 'Benetton', color: '#9CCB3B', livery: { image: alpineCar, body: '#9ccb3b', accent: '#f5f5f5', detail: '#1b3c8c' }, gridSlot: 15 },
  { id: 'jordan', label: 'Jordan', color: '#FFD700', livery: { image: visaCashAppCar, body: '#ffd700', accent: '#101820', detail: '#c8102e' }, gridSlot: 16 },
  { id: 'sauber', label: 'Sauber', color: '#D8481F', livery: { image: audiCar, body: '#d8481f', accent: '#f5f5f5', detail: '#1c1c1c' }, gridSlot: 17 },
  { id: 'renault', label: 'Renault', color: '#A300D4', livery: { image: redBullCar, body: '#2a2a6e', accent: '#ffd700', detail: '#f5f5f5' }, gridSlot: 18 },
  { id: 'toro-rosso', label: 'Toro Rosso', color: '#0E1626', livery: { image: mercedesCar, body: '#0e1626', accent: '#e3272e', detail: '#f5f5f5' }, gridSlot: 19 },
  { id: 'brawn', label: 'Brawn', color: '#863FE8', livery: { image: haasCar, body: '#f2f3f5', accent: '#1c1c1c', detail: '#c8102e' }, gridSlot: 20 },
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
