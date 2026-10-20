ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ui_lang text CHECK (ui_lang IN ('id','en','zh-CN','zh-TW'));
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (ui_lang) ON public.profiles TO authenticated;