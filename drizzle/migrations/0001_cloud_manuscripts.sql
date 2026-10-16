CREATE TABLE public.cloud_manuscripts (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  story_id text NOT NULL,
  bundle jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id),
  CONSTRAINT cloud_manuscripts_size CHECK (octet_length(bundle::text) < 5000000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_manuscripts TO authenticated;
GRANT ALL ON public.cloud_manuscripts TO service_role;
ALTER TABLE public.cloud_manuscripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own cloud manuscripts" ON public.cloud_manuscripts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own cloud manuscripts" ON public.cloud_manuscripts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own cloud manuscripts" ON public.cloud_manuscripts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own cloud manuscripts" ON public.cloud_manuscripts FOR DELETE TO authenticated USING (auth.uid() = user_id);