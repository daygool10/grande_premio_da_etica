import { describe, expect, it } from 'vitest';
import { TEAMS, TEAM_COUNT } from './teams';
import { MAX_TEAMS } from '../data/questions';

const pinInitials = (label: string): string =>
  label
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

describe('F1 team registry', () => {
  it('seats twenty fiercely distinct teams', () => {
    expect(TEAMS).toHaveLength(20);
  });

  it('keeps every team id and display name unique and URL/DB-safe', () => {
    const ids = TEAMS.map((team) => team.id);
    const labels = TEAMS.map((team) => team.label);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);

    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('gives every entry a colour, a car livery and pin initials', () => {
    for (const team of TEAMS) {
      expect(team.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(pinInitials(team.label)).toMatch(/^[A-Z]{1,2}$/);

      expect(team.livery).toBeDefined();
      expect(team.livery.body).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.livery.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.livery.detail).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('derives capacity from the registry instead of a literal 11', () => {
    expect(TEAM_COUNT).toBe(TEAMS.length);
    expect(MAX_TEAMS).toBe(TEAMS.length);
    expect(MAX_TEAMS).not.toBe(11);
  });
});