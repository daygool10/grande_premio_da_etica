interface FinishAnswer {
  player_id: string;
  question_index: number;
  created_at?: string;
}

function compareAnswerTimes(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;

  const aMilliseconds = Date.parse(a);
  const bMilliseconds = Date.parse(b);
  if (Number.isNaN(aMilliseconds) || Number.isNaN(bMilliseconds)) return undefined;
  if (aMilliseconds !== bMilliseconds) return aMilliseconds - bMilliseconds;

  const getSubMillisecond = (value: string) => {
    const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})$/i)?.[1] ?? '';
    return Number(fraction.padEnd(9, '0').slice(3, 9));
  };

  return getSubMillisecond(a) - getSubMillisecond(b);
}

export function sortFinishers<T extends { id: string }>(
  players: readonly T[],
  answers: readonly FinishAnswer[],
): T[] {
  const finishAnswers = new Map<string, FinishAnswer>();

  for (const answer of answers) {
    const previousAnswer = finishAnswers.get(answer.player_id);
    if (
      !previousAnswer ||
      answer.question_index > previousAnswer.question_index ||
      (answer.question_index === previousAnswer.question_index &&
        (compareAnswerTimes(answer.created_at, previousAnswer.created_at) ?? 0) < 0)
    ) {
      finishAnswers.set(answer.player_id, answer);
    }
  }

  const originalOrder = new Map(players.map((player, index) => [player.id, index]));

  return [...players].sort((a, b) => {
    const aAnswer = finishAnswers.get(a.id);
    const bAnswer = finishAnswers.get(b.id);

    if (aAnswer && bAnswer && aAnswer.question_index !== bAnswer.question_index) {
      return aAnswer.question_index - bAnswer.question_index;
    }

    const answerTimeOrder = compareAnswerTimes(aAnswer?.created_at, bAnswer?.created_at);
    return answerTimeOrder || (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0);
  });
}
