import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/GameStore';
import { getBoardSize, questions, type Question } from '../data/questions';
import { TEAM_COLORS } from '../lib/teams';
import { questionDeltas, overtakeReport } from '../lib/debrief';
import { playCue } from '../lib/sound';
import { TeamLogo } from './TeamLogo';
import { PlayerQuestion } from './PlayerQuestion';
import { PlayerPitStop } from './PlayerPitStop';
import { CircuitBoard } from './CircuitBoard';
import { PlayerScoreFlash } from './PlayerScoreFlash';

// Her games shuffle the question set into game.question_order; the debrief
// replay must walk question ids in the order the game actually asked them.
function buildOrderedQuestions(questionOrder?: readonly number[] | null): Question[] {
  if (!questionOrder || questionOrder.length === 0) return questions;
  return questionOrder
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => question !== undefined);
}

export function PlayerPlaying() {
  const { 
    game, currentPlayer, currentQuestion, players, 
    answers, selectedOption, hasAnswered, showResult,
    selectOption, submitAnswer, loadGameState, setViewState
  } = useGameStore();
  const [displayQuestionIndex, setDisplayQuestionIndex] = useState(
    () => game?.current_question_index ?? 0,
  );

  const orderedQuestions = useMemo(
    () => buildOrderedQuestions(game?.question_order),
    [game?.question_order],
  );

  const lastCueQuestion = useRef<number | null>(null);

  useEffect(() => {
    if (!game?.question_revealed || !hasAnswered || !currentPlayer) return;
    const index = game.current_question_index;
    if (lastCueQuestion.current === index) return;
    const option = currentQuestion?.options[selectedOption ?? -1];
    if (!option) return;
    lastCueQuestion.current = index;
    playCue(option.isCorrect ? 'correct' : 'wrong');
  }, [game?.question_revealed, game?.current_question_index, hasAnswered, currentPlayer, currentQuestion, selectedOption]);

  const roundDebrief = useMemo(() => {
    if (!hasAnswered || !game?.question_revealed || !currentPlayer) return null;
    const index = game.current_question_index;
    const deltas = questionDeltas(answers, players, orderedQuestions, index);
    const report = overtakeReport(deltas, players);
    return {
      delta: deltas.get(currentPlayer.id) ?? null,
      overtake: report.get(currentPlayer.id) ?? null,
    };
  }, [hasAnswered, game?.question_revealed, game?.current_question_index, answers, players, currentPlayer, orderedQuestions]);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 1500);
    return () => clearInterval(interval);
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('player_finished');
    }
  }, [game?.phase, setViewState]);

  useEffect(() => {
    if (!game || game.current_question_index <= displayQuestionIndex) return;

    const timer = window.setTimeout(() => {
      setDisplayQuestionIndex(game.current_question_index);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [game?.current_question_index, displayQuestionIndex]);

  useEffect(() => {
    if (game?.phase === 'question' && !game?.question_revealed) {
      setViewState('player_playing');
    }
  }, [game?.phase, game?.question_revealed, setViewState]);

  useEffect(() => {
    const lastAnswer = answers
      .filter(answer => answer.player_id === currentPlayer?.id)
      .reduce<typeof answers[number] | null>(
        (latest, answer) => !latest || answer.question_index > latest.question_index ? answer : latest,
        null,
      );
    const finishAnswerRevealed = game?.question_revealed ||
      game?.phase === 'finished' ||
      (lastAnswer !== null && game && game.current_question_index > lastAnswer.question_index);

    if (
      finishAnswerRevealed &&
      currentPlayer &&
      currentPlayer.position >= boardSize
    ) {
      setViewState('player_finished');
    }
  }, [
    game?.phase,
    game?.question_revealed,
    game?.current_question_index,
    currentPlayer?.id,
    currentPlayer?.position,
    answers,
    setViewState,
  ]);

  const q = currentQuestion;
  const boardSize = getBoardSize(game?.question_order?.length ?? questions.length);

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
      ? `✅ Acertou! Avance ${selectedAnswer.advance} casa${selectedAnswer.advance > 1 ? 's' : ''}!`
      : `❌ Errou! ${selectedAnswer.penalty || 'Não avance nesta rodada.'}`
    : '';

  if (game && game.current_question_index > displayQuestionIndex) {
    return (
      <PlayerPitStop teamName={currentPlayer.team_name} f1Team={currentPlayer.f1_team} launching />
    );
  }

  if (currentPlayer.skipped_turn && !hasAnsweredCurrentQuestion) {
    return (
      <PlayerPitStop teamName={currentPlayer.team_name} f1Team={currentPlayer.f1_team} />
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#1a1a2e] p-4">
      <img
        src="/player-question-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-90 blur-sm"
      />
      <div className="absolute inset-0 -z-10 bg-[#101322]/75" />
      <div className="relative z-10 mx-auto w-full max-w-2xl">
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
            <p className="text-sm text-gray-400">Pergunta {(game?.current_question_index || 0) + 1}</p>
            <p className="text-xs text-gray-500">Posição: {currentPlayer.position}/{boardSize}</p>
          </div>
        </div>

        {/* Board */}
        <div className="relative mb-4">
          <CircuitBoard players={players} boardSize={boardSize} compact />
          <PlayerScoreFlash
            delta={roundDebrief?.delta ?? null}
            overtake={roundDebrief?.overtake ?? null}
          />
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