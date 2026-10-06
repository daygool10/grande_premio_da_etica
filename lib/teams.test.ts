import { describe, expect, it } from 'vitest';
import { getTeamColor, MAX_TEAMS, TEAMS, TEAM_COUNT } from './teams';

describe('F1 team registry', () => {
  it('contains twenty teams with unique labels and grid slots', () => {
    expect(TEAMS).toHaveLength(20);
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

  it('derives capacity from the registry and falls back for unknown colours', () => {
    expect(TEAM_COUNT).toBe(TEAMS.length);
    expect(MAX_TEAMS).toBe(TEAMS.length);
    expect(MAX_TEAMS).not.toBe(11);
    expect(getTeamColor('Unknown team')).toBe('#d1d5db');
  });
});
