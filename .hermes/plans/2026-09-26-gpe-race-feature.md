---
type: plan
title: "Grande Prêmio da Ética — bug fixes, race feature, infra"
created: 2026-09-26
project: grande_premio_da_etica
status: approved
---

# Spec — grande_premio_da_etica

Approved by Messyer 2026-09-26 ("I agree with you on all accounts"). Decisions taken:
F1=A, F2=rank 3/2/1, F3=fixed, F4=correct answers only, F5=keep back1/back2 + skip with floor,
convert "voltar ao início", F6=admin-selectable, F7=cumulative speed, F8=drop podium-wait,
F9=no elimination, F10=players see the track. B1-B5 yes. I1=A hand-written types, I2=she applies SQL,
I3-I6 yes. H1-H5+H7 yes, H6 no. P1=yes, P2=user commits, P4=phases 0-3, P5=this document.
P3 = delegate to OpenCode (user instruction).

## Verified facts this spec rests on

- `answers.created_at` does not exist. Live: GET /rest/v1/answers?select=created_at -> HTTP 400,
  code 42703. `answers.answered_at` exists and is DB-populated (client never sends it).
- `games.question_started_at` does not exist (HTTP 400). Not needed: speed ranks come from
  `answered_at` alone, which is a single DB clock — no skew risk, no schema change.
- Question data: 35 questions, each with exactly 4 options and exactly 1 correct answer.
  Correct advances: 2 (x14), 3 (x20), 4 (x1). Perfect-race distance = 92.
- BOARD_SIZE = 10 and a perfect racer crosses it on question ~4 of 35 (31 dead questions).
- Realtime works for anon (subscribe -> status=SUBSCRIBED).
- TigerStyle gate is inert for .ts/.js: the gate calls the linter with `--file` and no `--lang`,
  which returns 0 findings ("language: unknown"). `.tsx` is not in SOURCE_EXTS at all.
  `--path` mode does lint them correctly. Harness gap — reported, not fixed here.

## Scoring model (F1=A, F2, F4, F5, F7)

`position` becomes the SCORE (points), not squares. Finish line = derived max, not the literal 10.

  scoreForQuestion(option, rank) =
      option.isCorrect ? option.advance + speedBonus(rank) : penaltyEffect(option.penaltyType)

  speedBonus(rank)  = rank 1 -> 3, rank 2 -> 2, rank 3 -> 1, else 0     (rank among CORRECT answers,
                      ordered by answered_at ascending within one question_index)
  penaltyEffect     = back1 -> -1, back2 -> -2, start -> -3 (converted, F5), skip -> 0
                      (skip remains a turn penalty via skipped_turn, not a score penalty)
  score is floored at 0.

  Perfect race ceiling = 92 + 35*3 = 197. RACE_TARGET derived from the question subset:
  for a race of N questions, target = sum over the first N questions of (max advance + 3).

Tiebreak (F7): cumulative speed. Each player accumulates the sum of their per-question rank
among correct answers (lower = faster). Sort: score desc, then cumulativeRank asc, then joined order.

## Race length (F6)

`RaceLength` = 10 | 20 | 35, chosen by the admin in the lobby, stored on the game row.
Default 20 (assumption — user did not specify; flagged to user).
Requires a new column `games.race_length integer not null default 20`.

## End condition (F8, F9, R3)

The race ends when all questions in the chosen subset are answered and revealed.
The podium-wait logic (`finishedPlayers.length >= min(3, players)`) is removed.
Nobody is eliminated: players keep answering for the whole subset.

## Workstreams (one OpenCode workspace each)

| Workspace | Branch | Scope |
|---|---|---|
| quiet-pixel | work/phase0 | B1 finishOrder answered_at; five hardcoded 10 -> BOARD_SIZE; trivial hygiene; .gitattributes |
| clever-moon | work/infra | lib/database.types.ts, typed client, typecheck script, eslint/prettier/editorconfig, vitest |
| shiny-tiger | work/scoring | lib/scoring.ts pure functions + tests; lib/teams.ts consolidation; penalty table (H7) |
| glowing-cactus | work/race | score-as-position, speed bonus, race length, reveal ordering, error states, player track |
| crisp-engine | work/cleanup | remove 14 unused deps, delete script.js, rename Admimfinished.tsx |

Merge order: phase0 -> infra -> scoring -> race -> cleanup. Verify (typecheck, build, test) after each merge.

## Out of scope

Authorization (D4/D5), src/ relocation (H6), CI, Supabase CLI type generation.
