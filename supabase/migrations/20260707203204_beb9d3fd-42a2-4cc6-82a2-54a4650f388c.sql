
-- ==== Enums ====
DO $$ BEGIN
  CREATE TYPE election_stage AS ENUM ('registration','voting','closed','results_published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE vote_type AS ENUM ('single','multiple');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==== Tables ====
CREATE TABLE IF NOT EXISTS public.student_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matric TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.student_roster TO anon, authenticated;
GRANT ALL ON public.student_roster TO service_role;
ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matric TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  voted BOOLEAN DEFAULT false,
  issuance_token UUID UNIQUE,
  auth_user_id UUID UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.voters TO authenticated;
GRANT SELECT ON public.voters TO anon;
GRANT ALL ON public.voters TO service_role;
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  picture_url TEXT,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.candidates TO anon, authenticated;
GRANT ALL ON public.candidates TO service_role, authenticated;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  vote_type vote_type DEFAULT 'single',
  max_selections INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.positions TO anon, authenticated;
GRANT ALL ON public.positions TO service_role, authenticated;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_token UUID NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT ON public.votes TO anon, authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.issuance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_token UUID NOT NULL,
  voter_id UUID REFERENCES public.voters(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON public.issuance_log TO service_role;
ALTER TABLE public.issuance_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.election_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.election_timeline TO anon, authenticated;
GRANT ALL ON public.election_timeline TO service_role, authenticated;
ALTER TABLE public.election_timeline ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  description TEXT,
  actor_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.voter_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES public.voters(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes'),
  verified BOOLEAN DEFAULT false
);
GRANT ALL ON public.voter_otp TO service_role;
ALTER TABLE public.voter_otp ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.voter_biometric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES public.voters(id) ON DELETE CASCADE UNIQUE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON public.voter_biometric TO service_role;
ALTER TABLE public.voter_biometric ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.aspirant_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  application_fee DECIMAL(10,2) NOT NULL,
  min_cgpa DECIMAL(3,2) NOT NULL,
  eligible_levels TEXT[] NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.aspirant_positions TO anon, authenticated;
GRANT ALL ON public.aspirant_positions TO service_role, authenticated;
ALTER TABLE public.aspirant_positions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.aspirants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT,
  full_name TEXT NOT NULL,
  matric TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  level TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  position_id UUID REFERENCES public.aspirant_positions(id) ON DELETE CASCADE NOT NULL,
  why_running TEXT NOT NULL,
  cgpa DECIMAL(3,2) NOT NULL,
  leadership_history TEXT NOT NULL,
  referee_form_url TEXT,
  declaration_form_url TEXT,
  payment_proof_url TEXT,
  payment_verified BOOLEAN DEFAULT false,
  payment_verified_at TIMESTAMPTZ,
  payment_verified_by UUID,
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_review_status TEXT DEFAULT 'pending',
  admin_review_notes TEXT,
  admin_reviewed_by UUID,
  admin_reviewed_at TIMESTAMPTZ,
  screening_scheduled_at TIMESTAMPTZ,
  screening_result TEXT,
  screening_notes TEXT,
  conditional_acceptance BOOLEAN DEFAULT false,
  conditional_reason TEXT,
  resubmission_deadline TIMESTAMPTZ,
  promoted_to_candidate BOOLEAN DEFAULT false,
  promoted_at TIMESTAMPTZ,
  candidate_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.aspirants TO anon, authenticated;
GRANT ALL ON public.aspirants TO service_role;
ALTER TABLE public.aspirants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payment_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.payment_instructions TO anon, authenticated;
GRANT ALL ON public.payment_instructions TO service_role, authenticated;
ALTER TABLE public.payment_instructions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.application_deadline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.application_deadline TO anon, authenticated;
GRANT ALL ON public.application_deadline TO service_role, authenticated;
ALTER TABLE public.application_deadline ENABLE ROW LEVEL SECURITY;

-- ==== Functions ====
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.is_voter_owner(_user_id uuid, _voter_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.voters WHERE id = _voter_id AND auth_user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.increment_vote_count(candidate_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN UPDATE public.candidates SET vote_count = vote_count + 1 WHERE id = candidate_id; END; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_voters_updated_at ON public.voters;
CREATE TRIGGER update_voters_updated_at BEFORE UPDATE ON public.voters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==== RLS Policies ====
-- student_roster: readable by all (needed for registration matric check)
DROP POLICY IF EXISTS "Anyone can read roster" ON public.student_roster;
CREATE POLICY "Anyone can read roster" ON public.student_roster FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage roster" ON public.student_roster;
CREATE POLICY "Admins manage roster" ON public.student_roster FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- voters
DROP POLICY IF EXISTS "Voters view own" ON public.voters;
CREATE POLICY "Voters view own" ON public.voters FOR SELECT USING (auth.uid() = auth_user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Allow voter registration" ON public.voters;
CREATE POLICY "Allow voter registration" ON public.voters FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Voters update own" ON public.voters;
CREATE POLICY "Voters update own" ON public.voters FOR UPDATE USING (auth.uid() = auth_user_id OR public.is_admin(auth.uid()));

-- candidates
DROP POLICY IF EXISTS "Anyone view candidates" ON public.candidates;
CREATE POLICY "Anyone view candidates" ON public.candidates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage candidates" ON public.candidates;
CREATE POLICY "Admins manage candidates" ON public.candidates FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- positions
DROP POLICY IF EXISTS "Anyone view positions" ON public.positions;
CREATE POLICY "Anyone view positions" ON public.positions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage positions" ON public.positions;
CREATE POLICY "Admins manage positions" ON public.positions FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- votes
DROP POLICY IF EXISTS "Anyone view votes" ON public.votes;
CREATE POLICY "Anyone view votes" ON public.votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone insert votes" ON public.votes;
CREATE POLICY "Anyone insert votes" ON public.votes FOR INSERT WITH CHECK (true);

-- issuance log
DROP POLICY IF EXISTS "No direct access to issuance log" ON public.issuance_log;
CREATE POLICY "No direct access to issuance log" ON public.issuance_log FOR SELECT USING (false);

-- timeline
DROP POLICY IF EXISTS "Anyone view timeline" ON public.election_timeline;
CREATE POLICY "Anyone view timeline" ON public.election_timeline FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage timeline" ON public.election_timeline;
CREATE POLICY "Admins manage timeline" ON public.election_timeline FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- admin_users
DROP POLICY IF EXISTS "Admins view admin users" ON public.admin_users;
CREATE POLICY "Admins view admin users" ON public.admin_users FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- audit log
DROP POLICY IF EXISTS "Admins view audit" ON public.audit_log;
CREATE POLICY "Admins view audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins insert audit" ON public.audit_log;
CREATE POLICY "Admins insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- voter_otp / voter_biometric: service-role only (no permissive policy - accessed via edge functions)
DROP POLICY IF EXISTS "no direct otp" ON public.voter_otp;
CREATE POLICY "no direct otp" ON public.voter_otp FOR SELECT USING (false);
DROP POLICY IF EXISTS "no direct biometric" ON public.voter_biometric;
CREATE POLICY "no direct biometric" ON public.voter_biometric FOR SELECT USING (false);

-- aspirant_positions
DROP POLICY IF EXISTS "Anyone view open aspirant positions" ON public.aspirant_positions;
CREATE POLICY "Anyone view open aspirant positions" ON public.aspirant_positions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage aspirant positions" ON public.aspirant_positions;
CREATE POLICY "Admins manage aspirant positions" ON public.aspirant_positions FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- aspirants
DROP POLICY IF EXISTS "Anyone submit application" ON public.aspirants;
CREATE POLICY "Anyone submit application" ON public.aspirants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "View own or admin" ON public.aspirants;
CREATE POLICY "View own or admin" ON public.aspirants FOR SELECT USING (email = (auth.jwt()->>'email') OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage aspirants" ON public.aspirants;
CREATE POLICY "Admins manage aspirants" ON public.aspirants FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- payment instructions
DROP POLICY IF EXISTS "Anyone view payment instructions" ON public.payment_instructions;
CREATE POLICY "Anyone view payment instructions" ON public.payment_instructions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage payment instructions" ON public.payment_instructions;
CREATE POLICY "Admins manage payment instructions" ON public.payment_instructions FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- application deadline
DROP POLICY IF EXISTS "Anyone view deadline" ON public.application_deadline;
CREATE POLICY "Anyone view deadline" ON public.application_deadline FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage deadline" ON public.application_deadline;
CREATE POLICY "Admins manage deadline" ON public.application_deadline FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==== Realtime ====
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.election_timeline;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==== Seeds ====
INSERT INTO public.positions (name, vote_type, max_selections, display_order) VALUES
 ('President','single',1,1),
 ('Vice President','single',1,2),
 ('Secretary General','single',1,3),
 ('Financial Secretary','single',1,4),
 ('Public Relations Officer','single',1,5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.aspirant_positions (name, application_fee, min_cgpa, eligible_levels, description, display_order) VALUES
 ('President',15000,4.0,ARRAY['500L'],'Lead the student union',1),
 ('Vice President',10000,3.5,ARRAY['400L'],'Support the President',2),
 ('General Secretary',8000,3.5,ARRAY['300L','400L','500L'],'Manage union administration',3),
 ('Assistant Gen. Secretary',6000,3.5,ARRAY['200L','300L'],'Assist the General Secretary',4),
 ('Treasurer',8000,3.5,ARRAY['400L','500L'],'Manage union finances',5),
 ('Director of Academic',6000,4.0,ARRAY['300L','400L','500L'],'Oversee academic affairs',6),
 ('Director of Social',6000,3.5,ARRAY['300L','400L','500L'],'Manage social events',7),
 ('Director of Sport',6000,3.5,ARRAY['300L','400L','500L'],'Coordinate sports activities',8),
 ('Director of Welfare',6000,3.5,ARRAY['300L','400L','500L'],'Handle student welfare',9),
 ('Assistant Director of Academic',5000,3.0,ARRAY['200L','300L'],'Support academic director',10),
 ('Assistant Director of Social',5000,3.0,ARRAY['200L','300L'],'Support social director',11),
 ('Assistant Director of Sport',5000,3.0,ARRAY['200L','300L'],'Support sport director',12),
 ('Assistant Director of Welfare',5000,3.0,ARRAY['200L','300L'],'Support welfare director',13),
 ('PRO I',6000,3.5,ARRAY['400L','500L'],'Lead public relations',14),
 ('PRO II',5000,3.0,ARRAY['200L','300L'],'Assist public relations',15)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.payment_instructions (account_number, bank_name, account_name, instructions, is_active)
VALUES ('7081795658','OPAY','Awwal Abubakar Sadik','Upload payment proof after transfer',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.student_roster (matric, name) VALUES
 ('21/08nus014','Awwal Abubakar Sadik'),
 ('22/08nus068','Abubakri Farouq Oluwafunmilayo')
ON CONFLICT (matric) DO NOTHING;
