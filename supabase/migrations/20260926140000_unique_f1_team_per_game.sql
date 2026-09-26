DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.players
    GROUP BY game_id, f1_team
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate F1 teams exist in a game. Resolve them before applying this migration.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS players_game_id_f1_team_unique
  ON public.players (game_id, f1_team);
