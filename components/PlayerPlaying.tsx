import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useGameStore } from '../store/GameStore';
import { questions, type Question } from '../data/questions';
import { TEAM_COLORS } from '../lib/teams';
import { questionDeltas, overtakeReport } from '../lib/debrief';
import { getEngineerMessage, hasLostTurnPenalty, hasSkipAnswerForQuestion } from '../lib/engineerMessages';
import { finishLineForOrder, hasReachedFinishLine } from '../server/shared/scoring.js';
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
    answers, selectedOption, hasAnswered,
    selectOption, submitAnswer, loadGameState, setViewState
  } = useGameStore();
  const [displayQuestionIndex, setDisplayQuestionIndex] = useState(
    () => game?.current_question_index ?? 0,
  );
  // The radio message is stored with the announcement it belongs to, so a
  // message from the previous question cannot survive into the next one.
  const [engineerMessage, setEngineerMessage] = useState<{ key: string; text: string } | null>(null);
  const lastEngineerMessage = useRef('');
  const announcedQuestion = useRef('');

  const orderedQuestions = useMemo(
    () => buildOrderedQuestions(game?.question_order),
    [game?.question_order],
  );

  const finishLine = finishLineForOrder(game?.question_order, questions);

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
  }, [loadGameState]);

  useEffect(() => {
    if (game?.phase === 'finished') {
      setViewState('player_finished');
    }
  }, [game?.phase, setViewState]);

  useEffect(() => {
    const questionIndex = game?.current_question_index;
    if (questionIndex === undefined || questionIndex <= displayQuestionIndex) return;

    const timer = window.setTimeout(() => {
      setDisplayQuestionIndex(questionIndex);
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
      (lastAnswer !== null && (game?.current_question_index ?? -1) > lastAnswer.question_index);

    if (
      finishAnswerRevealed &&
      currentPlayer?.id !== undefined &&
      hasReachedFinishLine(currentPlayer.position, finishLine)
    ) {
      setViewState('player_finished');
    }
  }, [
    game?.phase,
    game?.question_revealed,
    game?.current_question_index,
    currentPlayer?.id,
    currentPlayer?.position,
    finishLine,
    answers,
    setViewState,
  ]);

  const q = currentQuestion;

  // Her radio messages and her lost-turn screens both key off the moment the
  // question index moves past the one still on screen. The threshold is the
  // derived finish line here, not a board size: position is a score.
  const isQuestionAdvancing = Boolean(
    game && game.current_question_index > displayQuestionIndex,
  );
  const hasLostTurn = Boolean(
    currentPlayer?.skipped_turn ||
    (isQuestionAdvancing && currentPlayer && hasLostTurnPenalty(
      answers,
      currentPlayer.id,
      displayQuestionIndex,
      game?.question_order,
    )),
  );
  const isApplyingSkipPenalty = Boolean(
    isQuestionAdvancing &&
    currentPlayer &&
    hasSkipAnswerForQuestion(
      answers,
      currentPlayer.id,
      displayQuestionIndex,
      game?.question_order,
    ),
  );

  useEffect(() => {
    if (!game || !currentPlayer || !isQuestionAdvancing) return;

    const announcementKey = `${game.id}:${game.current_question_index}:${currentPlayer.id}`;
    if (announcedQuestion.current === announcementKey) return;
    announcedQuestion.current = announcementKey;

    if (hasLostTurn) return;

    const { text } = getEngineerMessage({
      player: currentPlayer,
      players,
      answers,
      questionIndex: displayQuestionIndex,
      questionOrder: game.question_order,
      boardSize: finishLine,
      previousMessage: lastEngineerMessage.current,
    });
    lastEngineerMessage.current = text;
    setEngineerMessage({ key: announcementKey, text });
  }, [
    answers,
    finishLine,
    currentPlayer,
    displayQuestionIndex,
    game,
    hasLostTurn,
    isQuestionAdvancing,
    players,
  ]);

  useEffect(() => {
    if (!engineerMessage) return;
    const timer = window.setTimeout(() => setEngineerMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [engineerMessage]);

  // A message only shows while it belongs to the question on screen and the
  // player has not just lost the turn it was about.
  const radioKey = `${game?.id}:${game?.current_question_index}:${currentPlayer?.id}`;
  const radioMessage = engineerMessage?.key === radioKey && !hasLostTurn ? engineerMessage.text : '';

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

  if (isQuestionAdvancing && hasLostTurn) {
    return (
      <PlayerPitStop
        teamName={currentPlayer.team_name}
        f1Team={currentPlayer.f1_team}
        launching={!currentPlayer.skipped_turn && !isApplyingSkipPenalty}
      />
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
      <AnimatePresence>
        {radioMessage && (
          <motion.aside
            key={radioMessage}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-2xl items-center gap-4 rounded-xl border border-cyan-300/40 border-l-4 border-l-cyan-300 bg-[#101b27]/95 px-5 py-4 text-left shadow-2xl backdrop-blur-md sm:px-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-200">
              <Radio className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                Rádio da equipe · {currentPlayer.team_name}
              </span>
              <span className="mt-1 block text-base font-semibold leading-snug text-white sm:text-lg">
                {radioMessage}
              </span>
            </span>
          </motion.aside>
        )}
      </AnimatePresence>
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
            <p className="text-xs text-gray-500">Posição: {currentPlayer.position}/{finishLine}</p>
          </div>
        </div>

        {/* Board */}
        <div className="relative mb-4">
          <CircuitBoard players={players} finishLine={finishLine} compact />
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
