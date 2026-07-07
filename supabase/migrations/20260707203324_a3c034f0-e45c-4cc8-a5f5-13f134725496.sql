
ALTER TABLE public.student_roster ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS manifesto TEXT;
ALTER TABLE public.election_timeline ADD COLUMN IF NOT EXISTS color_class TEXT;
ALTER TABLE public.election_timeline ADD COLUMN IF NOT EXISTS link_text TEXT;
ALTER TABLE public.election_timeline ADD COLUMN IF NOT EXISTS link_id TEXT;
ALTER TABLE public.aspirants ADD COLUMN IF NOT EXISTS user_id UUID;
