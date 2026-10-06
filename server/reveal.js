// ============================================
// Reveal sob autoridade do servidor
// A rota POST /games/:id/reveal centraliza o
// fechamento de uma rodada: valida o admin, tranca
// a partida com SELECT ... FOR UPDATE e calcula a
// pontuação inteira com o módulo compartilhado
// (server/shared/scoring.js). O cliente deixa de
// calcular qualquer delta — ele só exibe o que o
// servidor escreveu. O gabarito (is_correct e
// advance) nunca sai por esta resposta: cada linha
// tem has_answer/selected_option/correct/delta, mas
// o texto e o advance das opções ficam no banco.
// ============================================

import {
  raceFinishLine,
  scoreReveal,
  scoreForQuestion,
  rankCorrectAnswersForQuestion,
} from './shared/scoring.js';
import { sessionTokenFrom, isGameAdmin } from './auth.js';

export function registerReveal(app, pool) {
  app.post('/games/:id/reveal', async (req, res) => {
    try {
      const gameId = req.params.id;
      const token = sessionTokenFrom(req);
      if (!token || !(await isGameAdmin(pool, gameId, token))) {
        return res.status(401).json({ error: 'Invalid or missing session token' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // O lock na partida é o compare-and-set: ninguém
        // revela a mesma rodada duas vezes nem concorre
        // com uma atualização simultânea.
        const gameResult = await client.query(
          'SELECT * FROM games WHERE id = $1 FOR UPDATE',
          [gameId],
        );

        if (gameResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Game not found' });
        }

        const game = gameResult.rows[0];
        if (game.question_revealed) {
          await client.query('ROLLBACK');
          return res
            .status(409)
            .json({ error: 'Question already revealed', code: 'ALREADY_REVEALED' });
        }

        const questionOrder = Array.isArray(game.question_order) ? game.question_order : [];
        const questionId = questionOrder[game.current_question_index];
        if (questionId === undefined || questionId === null) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Game has no dealt questions' });
        }

        // A linha de chegada precisa do gabarito de TODAS
        // as perguntas sorteadas; a pergunta vigente
        // precisa do gabarito dela. Uma consulta cobre as
        // duas: o grupo por pergunta respeita a ordem do
        // deal e a ordem por option_index faz o índice do
        // array casar com o selected_option gravado.
        const optionsResult = await client.query(
          `SELECT o.question_id,
                  o.option_index,
                  o.is_correct AS "isCorrect",
                  o.advance AS "advance",
                  o.penalty_type AS "penaltyType"
             FROM public.question_options o
            WHERE o.question_id = ANY($1::int[])
            ORDER BY o.option_index`,
          [questionOrder],
        );

        const groups = new Map();
        for (const row of optionsResult.rows) {
          let group = groups.get(row.question_id);
          if (!group) {
            group = { id: row.question_id, options: [] };
            groups.set(row.question_id, group);
          }
          group.options.push(row);
        }

        const dealt = questionOrder.map((id) => {
          const group = groups.get(id);
          if (!group) {
            throw new Error(`Question ${id} from the game's question_order was not found.`);
          }
          return { options: group.options };
        });
        const finishLine = raceFinishLine(dealt);

        const currentGroup = groups.get(questionId);
        const currentQuestionOptions = currentGroup.options;

        const playersResult = await client.query(
          'SELECT id, game_id, team_name, position, skipped_turn FROM players WHERE game_id = $1 ORDER BY created_at ASC',
          [gameId],
        );

        const answersResult = await client.query(
          `SELECT player_id, question_index, selected_option, is_correct, created_at
             FROM answers
            WHERE game_id = $1 AND question_index = $2`,
          [gameId, game.current_question_index],
        );

        // Mesma regra de elegibilidade do cliente antigo:
        // quem não pulou e ainda não chegou à linha de
        // chegada precisa ter respondido.
        const answersByPlayer = new Map(
          answersResult.rows.map((answer) => [answer.player_id, answer]),
        );
        const eligiblePlayers = playersResult.rows.filter(
          (player) => !player.skipped_turn && player.position < finishLine,
        );
        if (eligiblePlayers.some((player) => !answersByPlayer.has(player.id))) {
          await client.query('ROLLBACK');
          return res
            .status(409)
            .json({ error: 'Cannot reveal an answer until every player has submitted one.' });
        }

        const updates = scoreReveal(
          currentQuestionOptions,
          playersResult.rows,
          answersResult.rows,
          game.current_question_index,
        );

        // Grava todos os jogadores numa única instrução,
        // com unnest dos arrays paralelos de ids,
        // posições e flags de pulo.
        await client.query(
          `UPDATE players
              SET position = u.position,
                  skipped_turn = u.skipped
             FROM unnest($1::uuid[], $2::int[], $3::boolean[]) AS u(id, position, skipped)
            WHERE players.id = u.id`,
          [
            updates.map((update) => update.id),
            updates.map((update) => update.position),
            updates.map((update) => update.skipped_turn),
          ],
        );

        await client.query('UPDATE games SET question_revealed = true WHERE id = $1', [gameId]);

        await client.query('COMMIT');

        const ranks = rankCorrectAnswersForQuestion(
          answersResult.rows,
          game.current_question_index,
        );
        const updatesById = new Map(updates.map((update) => [update.id, update]));

        // total_after sai do scoreReveal e delta sai do
        // scoreForQuestion: ambos usam as mesmas funções
        // compartilhadas, então não há segundo caminho
        // aritmético. Um player que pulou não é pontuado
        // nesta rodada: mantém a posição e delta 0.
        const results = playersResult.rows.map((player) => {
          const answer = answersByPlayer.get(player.id);
          const update = updatesById.get(player.id);
          const option =
            answer && !player.skipped_turn ? currentQuestionOptions[answer.selected_option] : null;
          const speedRank = ranks.get(player.id) ?? 0;
          return {
            player_id: player.id,
            team_name: player.team_name,
            has_answer: Boolean(answer),
            selected_option: answer ? answer.selected_option : null,
            correct: answer ? answer.is_correct : false,
            speed_rank: speedRank,
            delta: option ? scoreForQuestion(option, speedRank) : 0,
            total_before: player.position,
            total_after: update.position,
          };
        });

        res.json({
          question_index: game.current_question_index,
          finish_line: finishLine,
          results,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error revealing answer:', error);
      res.status(500).json({ error: error.message });
    }
  });
}