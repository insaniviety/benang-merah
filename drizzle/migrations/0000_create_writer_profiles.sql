CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own writer profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Update own writer profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE OR REPLACE FUNCTION public.create_writer_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data ->> 'display_name', ''), 100)) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_writer_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_writer_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_writer_profile();
INSERT INTO public.profiles (id, display_name) SELECT id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 100) FROM auth.users ON CONFLICT (id) DO NOTHING;