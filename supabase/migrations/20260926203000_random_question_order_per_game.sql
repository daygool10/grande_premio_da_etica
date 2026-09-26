ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS question_order integer[];
