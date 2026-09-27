import { useEffect } from 'react';
import { useGameStore } from '../store/GameStore';
import { activeRaceLength, raceFinishLine } from '../store/raceProgress';
import { TEAM_COLORS } from '../lib/teams';
import { TeamLogo } from './TeamLogo';
import { CircuitBoard } from './CircuitBoard';
import { PlayerQuestion } from './PlayerQuestion';

export function PlayerPlaying() {
  const { 
    game, currentPlayer, currentQuestion, players, 
    answers, selectedOption, hasAnswered, showResult,
    selectOption, submitAnswer, loadGameState, setViewState
  } = useGameStore();

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('player_finished');
    }
  }, [game?.phase, setViewState]);

  useEffect(() => {
    if (game?.phase === 'question' && !game?.question_revealed) {
      setViewState('player_playing');
    }
  }, [game?.phase, game?.question_revealed, setViewState]);

  const q = currentQuestion;

  if (!q || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const selectedAnswer = selectedOption === null ? null : q.options[selectedOption];
  const hasAnsweredCurrentQuestion = answers.some(
    (answer) =>
      answer.player_id === currentPlayer.id &&
      answer.question_index === game?.current_question_index,
  );
  const resultMessage = selectedAnswer
    ? selectedAnswer.isCorrect
      ? `✅ Acertou! Ganhou ${selectedAnswer.advance} ponto${selectedAnswer.advance > 1 ? 's' : ''}!`
      : `❌ Errou! ${selectedAnswer.penalty || 'Não pontue nesta rodada.'}`
    : '';

  const raceLength = activeRaceLength(game);
  const finishLine = raceFinishLine(game);

  if (currentPlayer.skipped_turn && !hasAnsweredCurrentQuestion) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4">
        <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center text-center">
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: TEAM_COLORS[currentPlayer.f1_team] }}
          >
            <TeamLogo team={currentPlayer.f1_team} />
          </div>
          <h2 className="mb-3 text-2xl font-black text-white">Rodada perdida</h2>
          <p className="max-w-lg text-gray-300">
            {currentPlayer.team_name}, esta dupla está cumprindo a punição e não precisa responder esta pergunta.
            A próxima pergunta aparecerá quando a rodada terminar.
          </p>
          <p className="mt-4 animate-pulse text-sm text-gray-500">Aguardando o administrador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-[#1a1a2e]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: TEAM_COLORS[currentPlayer.f1_team] }}
            >
              <TeamLogo team={currentPlayer.f1_team} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{currentPlayer.team_name}</p>
              <p className="text-gray-400 text-xs">{currentPlayer.f1_team}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Pergunta {(game?.current_question_index || 0) + 1}/{raceLength}</p>
            <p className="text-xs text-gray-500">Pontos: {currentPlayer.position}/{finishLine}</p>
          </div>
        </div>

        {/* Board */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-gray-600 shadow-xl">
          <CircuitBoard players={players} finishLine={finishLine} highlightPlayerId={currentPlayer.id} compact />
        </div>

        <PlayerQuestion
          question={q}
          selectedOption={selectedOption}
          hasAnswered={hasAnswered}
          revealed={Boolean(game?.question_revealed)}
          selectOption={selectOption}
          submitAnswer={submitAnswer}
        />

        {/* Result Message - only after admin reveals */}
        {game?.question_revealed && hasAnswered && (
          <div className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
            selectedAnswer?.isCorrect
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : 'bg-red-900/50 text-red-400 border border-red-700'
          }`}>
            {resultMessage}
          </div>
        )}

        {/* Waiting for admin to reveal */}
        {hasAnswered && !game?.question_revealed && (
          <div className="mt-4 text-center text-gray-400 text-sm animate-pulse bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            ✅ Resposta enviada! Aguardando o admin revelar a resposta correta...
          </div>
        )}

        {/* After reveal - waiting for next question */}
        {hasAnswered && game?.question_revealed && (
          <div className="mt-4 text-center text-gray-400 text-sm animate-pulse">
            Aguardando próxima pergunta...
          </div>
        )}
      </div>
    </div>
  );
}