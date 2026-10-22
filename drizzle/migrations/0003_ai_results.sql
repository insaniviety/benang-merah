CREATE TABLE public.ai_results (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  story_id text NOT NULL,
  result jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id),
  CHECK (pg_column_size(result) < 2000000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_results TO authenticated;
GRANT ALL ON public.ai_results TO service_role;
ALTER TABLE public.ai_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.ai_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.ai_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.ai_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.ai_results FOR DELETE TO authenticated USING (auth.uid() = user_id);