CREATE TABLE public.ai_access_blocks (
 user_id uuid NOT NULL,
 provider text NOT NULL CHECK (provider IN ('gemini','claude','openai')),
 reason text NOT NULL,
 status integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, provider)
);
GRANT SELECT ON public.ai_access_blocks TO authenticated;
GRANT ALL ON public.ai_access_blocks TO service_role;
ALTER TABLE public.ai_access_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read AI access blocks" ON public.ai_access_blocks FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);