-- Fix infinite recursion in voters RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Voters can view own record" ON public.voters;
DROP POLICY IF EXISTS "Voters can update own record" ON public.voters;

-- Create a security definer function to check voter ownership
CREATE OR REPLACE FUNCTION public.is_voter_owner(_user_id uuid, _voter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.voters
    WHERE id = _voter_id
      AND id = _user_id
  )
$$;

-- Create new policies using the security definer function
CREATE POLICY "Voters can view own record"
ON public.voters
FOR SELECT
USING (public.is_voter_owner(auth.uid(), id));

CREATE POLICY "Voters can update own record"
ON public.voters
FOR UPDATE
USING (public.is_voter_owner(auth.uid(), id));