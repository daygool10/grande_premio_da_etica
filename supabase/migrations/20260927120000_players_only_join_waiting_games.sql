CREATE OR REPLACE FUNCTION public.require_waiting_game_for_player()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_game_phase text;
BEGIN
  SELECT phase
  INTO current_game_phase
  FROM public.games
  WHERE id = NEW.game_id
  FOR UPDATE;

  IF NOT FOUND OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RAISE EXCEPTION 'Game is not accepting players'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_require_waiting_game ON public.players;

CREATE TRIGGER players_require_waiting_game
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.require_waiting_game_for_player();
