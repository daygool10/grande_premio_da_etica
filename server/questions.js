// ============================================
// Perguntas sob autoridade do servidor
// O sorteio da ordem (deal) e a lista que o
// cliente recebe agora nascem do banco. A rota
// GET /games/:id/questions monta a resposta com
// um whitelist estrito — só { id, title, scenario }
// e as opções públicas { index, text }: nenhum
// campo do gabarito (is_correct, advance, penalty,
// penalty_type) chega ao cliente. Uma opção certa
// e uma errada saem com o MESMO formato, porque
// neste seed toda opção certa tem penalty_type NULL
// e toda errada carrega um — vazar esse campo
// denunciaria a resposta. A linha de chegada usa
// raceFinishLine do módulo compartilhado, sobre as
// perguntas na ordem do deal.
// ============================================

import { raceFinishLine } from './shared/scoring.js';

// ============================================
// Deal: sorteia a ordem de uma partida
// ============================================

// O MESMO Fisher-Yates que o cliente usa hoje
// (data/questions.tsx, createQuestionOrder): percorre
// o array do fim até o índice 1, trocando cada posição
// com um índice uniforme em [0, i]. A manutenção é
// intencional — o sorteio é idêntico, só que a fonte
// deixa de ser o bundle e vira a tabela questions.
/**
 * @param {import('pg').Pool} pool
 * @param {number | null | undefined} questionCount
 * @returns {Promise<number[]>}
 */
export async function dealQuestionOrder(pool, questionCount) {
  const result = await pool.query('SELECT id FROM public.questions ORDER BY id');
  const order = result.rows.map((row) => row.id);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[randomIndex]] = [order[randomIndex], order[index]];
  }

  // Sem contagem, a partida recebe TODAS as perguntas;
  // com contagem, só as primeiras N sorteadas. Não há
  // padrão de contagem — o knob do requisito do host é
  // exatamente este parâmetro.
  if (questionCount === undefined || questionCount === null) {
    return order;
  }
  return order.slice(0, questionCount);
}

// ============================================
// Rota: lista pública de perguntas da partida
// ============================================

export function registerQuestions(app, pool) {
  app.get('/games/:id/questions', async (req, res) => {
    try {
      const gameResult = await pool.query(
        'SELECT question_order FROM games WHERE id = $1',
        [req.params.id],
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const questionOrder = gameResult.rows[0].question_order;
      if (!Array.isArray(questionOrder) || questionOrder.length === 0) {
        return res.status(409).json({ error: 'Game has no dealt questions' });
      }

      // A consulta de opções também busca o gabarito
      // (is_correct e advance) porque a linha de chegada
      // é calculada aqui; a resposta, porém, sai pelo
      // whitelist e nunca carrega esses campos.
      const questionsResult = await pool.query(
        `SELECT q.id, q.title, q.scenario,
                o.option_index, o.option_text,
                o.is_correct AS "isCorrect", o.advance AS "advance"
           FROM public.questions q
           JOIN public.question_options o ON o.question_id = q.id
          WHERE q.id = ANY($1::int[])
          ORDER BY o.option_index`,
        [questionOrder],
      );

      // Agrupa por pergunta: options carrega o whitelist
      // público e scored só as linhas cruas para o módulo
      // de pontuação. Separar os dois é o que impede o
      // gabarito de vazar numa resposta montada às pressas.
      const groups = new Map();
      for (const row of questionsResult.rows) {
        let group = groups.get(row.id);
        if (!group) {
          group = { id: row.id, title: row.title, scenario: row.scenario, options: [], scored: [] };
          groups.set(row.id, group);
        }
        group.options.push({ index: row.option_index, text: row.option_text });
        group.scored.push(row);
      }

      // Linha de chegada na ordem do deal: cada pergunta
      // entra com as linhas cruas, que o raceFinishLine lê
      // como isCorrect/advance.
      const finish_line = raceFinishLine(
        questionOrder.map((questionId) => {
          const group = groups.get(questionId);
          if (!group) {
            throw new Error(`Question ${questionId} from the game's question_order was not found.`);
          }
          return { options: group.scored };
        }),
      );

      // Whitelist explícito e nada mais: um objeto montado
      // campo a campo, nunca um spread de linha do banco
      // com exclusões depois.
      const questions = questionOrder.map((questionId) => {
        const group = groups.get(questionId);
        return {
          id: group.id,
          title: group.title,
          scenario: group.scenario,
          options: group.options,
        };
      });

      res.json({ questions, finish_line });
    } catch (error) {
      if (error.code === '42P01') {
        return res
          .status(503)
          .json({ error: 'Questions table missing: apply migrations 0004 and 0005 before using this route' });
      }
      console.error('Error fetching dealt questions:', error);
      res.status(500).json({ error: error.message });
    }
  });
}