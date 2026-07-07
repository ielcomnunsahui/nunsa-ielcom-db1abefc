-- Fix RLS policy for student_roster to allow matric verification during registration
DROP POLICY IF EXISTS "Allow matric verification during registration" ON public.student_roster;
CREATE POLICY "Allow matric verification during registration" 
ON public.student_roster 
FOR SELECT 
USING (true);

-- Add sample student data for testing
INSERT INTO public.student_roster (matric, name) VALUES
('21/08nus014', 'John Doe'),
('22/09nus001', 'Jane Smith'),
('23/10nus025', 'Mike Johnson')
ON CONFLICT (matric) DO NOTHING;

-- Create admin user in auth.users and link to admin_users
-- Note: You'll need to manually create the auth user first through Supabase Auth
-- Then insert into admin_users table with the email provided

-- Add OTP table for fallback authentication
CREATE TABLE IF NOT EXISTS public.voter_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES public.voters(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes'),
  verified BOOLEAN DEFAULT false,
  UNIQUE(voter_id, otp_code)
);

ALTER TABLE public.voter_otp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTP"
ON public.voter_otp
FOR SELECT
USING (voter_id IN (SELECT id FROM public.voters WHERE matric = (SELECT matric FROM public.voters WHERE id = auth.uid())));

CREATE POLICY "Service role can manage OTP"
ON public.voter_otp
FOR ALL
USING (true)
WITH CHECK (true);

-- Add biometric credentials table
CREATE TABLE IF NOT EXISTS public.voter_biometric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES public.voters(id) ON DELETE CASCADE UNIQUE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.voter_biometric ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own biometric"
ON public.voter_biometric
FOR SELECT
USING (voter_id IN (SELECT id FROM public.voters WHERE matric = (SELECT matric FROM public.voters WHERE id = auth.uid())));

CREATE POLICY "Service role can manage biometric"
ON public.voter_biometric
FOR ALL
USING (true)
WITH CHECK (true);