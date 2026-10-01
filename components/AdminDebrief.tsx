import { scoresBeforeQuestion } from '../lib/debrief';
import { rankCorrectAnswersForQuestion, scoreForQuestion, applyScore } from '../server/shared/scoring.js';
import type { Question } from '../data/questions';

// Her platform has no database.types module; these mirror the rows her Express
// API returns for players and answers (only the fields this table reads).
interface PlayerRow {
  id: string;
  team_name: string;
  position: number;
}

interface AnswerRow {
  player_id: string;
  question_index: number;
  selected_option: number;
  is_correct: boolean;
  answered_at?: string;
}

interface AdminDebriefProps {
  players: readonly PlayerRow[];
  answers: readonly AnswerRow[];
  question: Question | null;
  questionIndex: number;
  // Her games ask a per-game shuffled subset (game.question_order), so the
  // before-question replay must walk the questions in the order the game asked
  // them, not the base data/questions array.
  orderedQuestions: readonly Question[];
}

interface DebriefRow {
  playerId: string;
  teamName: string;
  letter: string;
  hasAnswer: boolean;
  correct: boolean;
  speedRank: number;
  delta: number;
  total: number;
}

export function AdminDebrief({ players, answers, question, questionIndex, orderedQuestions }: AdminDebriefProps) {
  if (!question) return null;

  const before = scoresBeforeQuestion(answers, players, orderedQuestions, questionIndex);
  const ranks = rankCorrectAnswersForQuestion(answers, questionIndex);
  const answerByPlayer = new Map(
    answers
      .filter((answer) => answer.question_index === questionIndex)
      .map((answer) => [answer.player_id, answer]),
  );

  const rows: DebriefRow[] = players
    .map((player) => {
      const answer = answerByPlayer.get(player.id);
      const option = answer ? question.options[answer.selected_option] : undefined;
      const speedRank = answer ? (ranks.get(player.id) ?? 0) : 0;
      const scoreBefore = before.get(player.id) ?? 0;
      const delta = option ? scoreForQuestion(option, speedRank) : 0;
      return {
        playerId: player.id,
        teamName: player.team_name,
        letter: answer ? String.fromCharCode(65 + answer.selected_option) : '—',
        hasAnswer: Boolean(answer),
        correct: answer ? answer.is_correct : false,
        speedRank,
        delta,
        total: applyScore(scoreBefore, delta),
      };
    })
    .sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      return a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0;
    });

  return (
    <section className="mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
        📊 Debrief da Rodada
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wider text-gray-400">
              <th className="py-2 pr-3 font-bold">Dupla</th>
              <th className="py-2 pr-3 font-bold">Escolha</th>
              <th className="py-2 pr-3 font-bold">Resultado</th>
              <th className="py-2 pr-3 font-bold">Ordem</th>
              <th className="py-2 pr-3 text-right font-bold">Pontos</th>
              <th className="py-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId} className="border-b border-gray-700/50 last:border-0">
                <td className="py-2 pr-3 font-bold text-white">{row.teamName}</td>
                <td className="py-2 pr-3 text-gray-200">{row.letter}</td>
                <td className="py-2 pr-3">
                  {!row.hasAnswer ? (
                    <span className="text-gray-500">—</span>
                  ) : row.correct ? (
                    <span className="font-bold text-green-400">✓ Certo</span>
                  ) : (
                    <span className="font-bold text-red-400">✗ Errado</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-gray-200">
                  {row.speedRank > 0 ? `${row.speedRank}º` : '—'}
                </td>
                <td
                  className={`py-2 pr-3 text-right font-bold ${
                    row.delta > 0 ? 'text-green-400' : row.delta < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}
                >
                  {row.delta > 0 ? `+${row.delta}` : row.delta}
                </td>
                <td className="py-2 text-right font-bold text-white">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}