/**
 * Escolhe a ordem das perguntas de uma partida a partir dos ids disponiveis.
 * Devolve exatamente `length` ids distintos, ou todos quando `length` for maior que o banco.
 * A chave nunca entra aqui: a ordem sera revelada de qualquer forma no payload das perguntas.
 */
export function chooseQuestionOrder(
  availableIds: number[],
  length: number,
  shuffle: (values: number[]) => number[] = shuffleIds,
): number[] {
  if (availableIds.length === 0) return [];
  const wanted = Math.max(1, Math.min(Math.trunc(length) || availableIds.length, availableIds.length));
  const unique = Array.from(new Set(availableIds));
  const shuffled = shuffle(unique.slice());
  if (shuffled.length !== unique.length) {
    throw new Error('chooseQuestionOrder: the shuffle must keep every id exactly once');
  }
  return shuffled.slice(0, wanted);
}

export function shuffleIds(values: number[]): number[] {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export const RACE_LENGTH_CHOICES = [5, 10, 20] as const;
