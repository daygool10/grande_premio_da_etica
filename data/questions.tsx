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

export function boardScale(questionCount: number): number {
  return 4 * questionCount;
}
