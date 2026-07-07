-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage student roster" ON public.student_roster;
DROP POLICY IF EXISTS "Admins can view all voters" ON public.voters;
DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can manage positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can manage timeline" ON public.election_timeline;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Admins can manage admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage student roster"
ON public.student_roster
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all voters"
ON public.voters
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage candidates"
ON public.candidates
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage positions"
ON public.positions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage timeline"
ON public.election_timeline
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));