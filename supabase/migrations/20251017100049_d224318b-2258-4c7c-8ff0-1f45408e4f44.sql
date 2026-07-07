-- Function to increment candidate vote count
CREATE OR REPLACE FUNCTION increment_vote_count(candidate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.candidates
  SET vote_count = vote_count + 1
  WHERE id = candidate_id;
END;
$$;

-- Update RLS policies for admin operations
CREATE POLICY "Admins can manage student roster" ON public.student_roster
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage candidates" ON public.candidates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage positions" ON public.positions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage timeline" ON public.election_timeline
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all voters" ON public.voters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can insert audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Allow backend to insert votes
CREATE POLICY "Service role can insert votes" ON public.votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage issuance log" ON public.issuance_log
  FOR ALL WITH CHECK (true);