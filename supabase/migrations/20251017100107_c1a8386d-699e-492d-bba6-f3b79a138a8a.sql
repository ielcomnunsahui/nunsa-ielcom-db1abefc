-- Fix: Add RLS policy for admin_users table
CREATE POLICY "Admins can view admin users" ON public.admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Fix: Update function with explicit search_path (re-create to ensure it's set)
DROP FUNCTION IF EXISTS increment_vote_count(UUID);

CREATE OR REPLACE FUNCTION increment_vote_count(candidate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.candidates
  SET vote_count = vote_count + 1
  WHERE id = candidate_id;
END;
$$;