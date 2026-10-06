export interface QuestionOption {
  option_index: number;
  text: string;
}

export interface Question {
  id: number;
  title: string;
  scenario: string;
  options: QuestionOption[];
}

export const F1_TEAMS = [
  'McLaren', 'Ferrari', 'Red Bull', 'Mercedes', 'Aston Martin',
  'Williams', 'Visa Cash App', 'Alpine', 'Audi', 'Cadillac', 'Haas',
];

export const TEAM_COLORS: Record<string, string> = {
  'McLaren': '#FF8000', 'Ferrari': '#E80020', 'Red Bull': '#3671C6',
  'Mercedes': '#09bb9d', 'Aston Martin': '#229971', 'Williams': '#64C4FF',
  'Visa Cash App': '#6692FF', 'Alpine': '#FF87BC', 'Audi': '#C0C0C0',
  'Cadillac': '#ccbf0d', 'Haas': '#B6BABD',
};

export function boardScale(questionCount: number): number {
  return 4 * questionCount;
}

export const MAX_TEAMS = 11;
