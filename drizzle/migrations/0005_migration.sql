CREATE TABLE public.ai_daily_usage (
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
GRANT SELECT ON public.ai_daily_usage TO authenticated;
GRANT ALL ON public.ai_daily_usage TO service_role;
ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own usage readable" ON public.ai_daily_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Atomically claim one free check; returns the new count, or -1 when the limit is reached.
CREATE OR REPLACE FUNCTION public.claim_ai_quota(_limit integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; uid uuid := auth.uid(); d date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.ai_daily_usage(user_id, usage_date, used) VALUES (uid, d, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE SET used = ai_daily_usage.used + 1 WHERE ai_daily_usage.used < _limit
  RETURNING used INTO n;
  RETURN COALESCE(n, -1);
END $$;
REVOKE ALL ON FUNCTION public.claim_ai_quota(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ai_quota(integer) TO authenticated;

-- Refund after a failed run; server-only so writers cannot mint extra checks.
CREATE OR REPLACE FUNCTION public.refund_ai_quota(_user uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ai_daily_usage SET used = GREATEST(used - 1, 0) WHERE user_id = _user AND usage_date = (now() AT TIME ZONE 'utc')::date;
$$;
REVOKE ALL ON FUNCTION public.refund_ai_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_quota(uuid) TO service_role;