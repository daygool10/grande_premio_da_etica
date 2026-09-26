interface FinishAnswer {
  player_id: string;
  answered_at?: string;
}

export function sortFinishers<T extends { id: string }>(
  players: readonly T[],
  answers: readonly FinishAnswer[],
): T[] {
  const latestAnswerTime = new Map<string, number>();

  for (const answer of answers) {
    if (!answer.answered_at) continue;

    const timestamp = Date.parse(answer.answered_at);
    if (Number.isNaN(timestamp)) continue;

    const previousTimestamp = latestAnswerTime.get(answer.player_id);
    if (previousTimestamp === undefined || timestamp > previousTimestamp) {
      latestAnswerTime.set(answer.player_id, timestamp);
    }
  }

  return [...players].sort((a, b) => {
    const aTime = latestAnswerTime.get(a.id);
    const bTime = latestAnswerTime.get(b.id);

    if (aTime === undefined && bTime === undefined) return 0;
    if (aTime === undefined) return 1;
    if (bTime === undefined) return -1;
    return aTime - bTime;
  });
}
