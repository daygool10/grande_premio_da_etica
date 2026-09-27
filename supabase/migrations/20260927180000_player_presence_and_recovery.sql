ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.player_heartbeat(p_player_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.players
  SET last_seen = now(),
      is_connected = true
  WHERE id = p_player_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_offline_player(
  p_player_id uuid,
  p_admin_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_game_id uuid;
  target_last_seen timestamptz;
  current_game_phase text;
  current_admin_id text;
BEGIN
  SELECT game_id
  INTO target_game_id
  FROM public.players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT phase, admin_id
  INTO current_game_phase, current_admin_id
  FROM public.games
  WHERE id = target_game_id
  FOR UPDATE;

  IF NOT FOUND
     OR current_admin_id IS DISTINCT FROM p_admin_id
     OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RETURN false;
  END IF;

  SELECT last_seen
  INTO target_last_seen
  FROM public.players
  WHERE id = p_player_id
    AND game_id = target_game_id
  FOR UPDATE;

  IF NOT FOUND OR target_last_seen > now() - interval '90 seconds' THEN
    RETURN false;
  END IF;

  DELETE FROM public.answers WHERE player_id = p_player_id;
  DELETE FROM public.players WHERE id = p_player_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_waiting_player(p_player_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_game_id uuid;
  current_game_phase text;
BEGIN
  SELECT game_id
  INTO target_game_id
  FROM public.players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT phase
  INTO current_game_phase
  FROM public.games
  WHERE id = target_game_id
  FOR UPDATE;

  IF NOT FOUND OR current_game_phase IS DISTINCT FROM 'waiting' THEN
    RETURN false;
  END IF;

  DELETE FROM public.answers WHERE player_id = p_player_id;
  DELETE FROM public.players WHERE id = p_player_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.player_heartbeat(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_offline_player(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_waiting_player(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_heartbeat(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_offline_player(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leave_waiting_player(uuid) TO anon, authenticated;
