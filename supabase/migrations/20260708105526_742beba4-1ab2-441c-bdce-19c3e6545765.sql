
-- Storage: policies for aspirant-documents bucket
DROP POLICY IF EXISTS "aspirant-documents public read" ON storage.objects;
CREATE POLICY "aspirant-documents public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'aspirant-documents');

DROP POLICY IF EXISTS "aspirant-documents authenticated upload" ON storage.objects;
CREATE POLICY "aspirant-documents authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'aspirant-documents');

DROP POLICY IF EXISTS "aspirant-documents anon upload" ON storage.objects;
CREATE POLICY "aspirant-documents anon upload"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'aspirant-documents');

DROP POLICY IF EXISTS "aspirant-documents authenticated update" ON storage.objects;
CREATE POLICY "aspirant-documents authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'aspirant-documents');

-- Registration OTP (pre-account stepwise flow)
CREATE TABLE IF NOT EXISTS public.registration_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  matric TEXT NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.registration_otp TO service_role;
ALTER TABLE public.registration_otp ENABLE ROW LEVEL SECURITY;
-- No public policies; only service_role (edge functions) accesses it.

CREATE INDEX IF NOT EXISTS registration_otp_matric_idx ON public.registration_otp(matric);
CREATE INDEX IF NOT EXISTS registration_otp_email_idx ON public.registration_otp(email);

-- Aspirant statistics for AdminAspirants dashboard
CREATE OR REPLACE FUNCTION public.get_aspirant_statistics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'qualified', COUNT(*) FILTER (WHERE status = 'qualified'),
    'disqualified', COUNT(*) FILTER (WHERE status = 'disqualified'),
    'promoted', COUNT(*) FILTER (WHERE status = 'promoted')
  )
  INTO result
  FROM public.aspirants;
  RETURN COALESCE(result, '{"total":0,"pending":0,"qualified":0,"disqualified":0,"promoted":0}'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_aspirant_statistics() TO authenticated, anon, service_role;

-- OTP cooldown/resend tracking on voter_otp (legacy)
ALTER TABLE public.voter_otp ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now();
