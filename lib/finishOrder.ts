interface FinishAnswer {
  player_id: string;
  created_at?: string;
}

export function sortFinishers<T extends { id: string }>(
  players: readonly T[],
  answers: readonly FinishAnswer[],
): T[] {
  const latestAnswerTime = new Map<string, number>();

  for (const answer of answers) {
    if (!answer.created_at) continue;

    const timestamp = Date.parse(answer.created_at);
    if (Number.isNaN(timestamp)) continue;

    const previousTimestamp = latestAnswerTime.get(answer.player_id);
    if (previousTimestamp === undefined || timestamp > previousTimestamp) {
      latestAnswerTime.set(answer.player_id, timestamp);
    }
  }

  return [...players].sort((a, b) => {
    const aTime = latestAnswerTime.get(a.id);
    const bTime = latestAnswerTime.get(b.id);

    if (aTime === undefined || bTime === undefined) return 0;
    return aTime - bTime;
  });
}
