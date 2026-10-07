import { describe, expect, it } from 'vitest';
import { getTeamColor, MAX_TEAMS, TEAMS, TEAM_COUNT } from './teams';

describe('F1 team registry', () => {
  it('pins the roster the owner settled on, with unique labels and grid slots', () => {
    // O dono cortou as cinco equipes historicas que nao tinham carro na lista dele
    // (Brabham, Tyrrell, Benetton, Jordan, Toro Rosso), entao o registro passou de 20
    // para 15. A lista fica fixada aqui de proposito: mudar o elenco tem que doer.
    expect(TEAMS.map((team) => team.label)).toEqual([
      'McLaren', 'Ferrari', 'Red Bull', 'Mercedes', 'Aston Martin', 'Williams',
      'Visa Cash App', 'Alpine', 'Audi', 'Cadillac', 'Haas',
      'Lotus', 'Sauber', 'Renault', 'Brawn',
    ]);
    expect(new Set(TEAMS.map((team) => team.label)).size).toBe(TEAMS.length);
    expect(new Set(TEAMS.map((team) => team.gridSlot)).size).toBe(TEAMS.length);
  });

  it('keeps every team id unique and URL/DB-safe', () => {
    const ids = TEAMS.map((team) => team.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('gives every entry a colour, a car livery and pin initials', () => {
    for (const team of TEAMS) {
      expect(team.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.label.split(/\s+/).map((word) => word[0]).join('').slice(0, 2)).toMatch(/^[A-Z]{1,2}$/);
      expect(team.livery.body).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.livery.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.livery.detail).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('gives every team a car image, so no duo can race without a car', () => {
    // As equipes historicas entraram sem arte propria e ficaram sem carro nenhum no tabuleiro; as
    // quatro que sobreviveram agora carregam o proprio carro (Lotus, Sauber, Renault, Brawn).
    const withoutCar = TEAMS.filter((team) => !team.livery.image).map((team) => team.label);
    expect(withoutCar).toEqual([]);
  });

  it('derives capacity from the registry and falls back for unknown colours', () => {
    expect(TEAM_COUNT).toBe(TEAMS.length);
    expect(MAX_TEAMS).toBe(TEAMS.length);
    expect(MAX_TEAMS).not.toBe(11);
    expect(MAX_TEAMS).toBe(15);
    expect(getTeamColor('Unknown team')).toBe('#d1d5db');
  });
});
