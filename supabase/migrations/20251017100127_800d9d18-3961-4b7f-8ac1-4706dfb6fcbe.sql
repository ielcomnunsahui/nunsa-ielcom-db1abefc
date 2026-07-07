-- Fix: Drop trigger first, then update function with search_path, then recreate trigger
DROP TRIGGER IF EXISTS update_voters_updated_at ON public.voters;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate the trigger
CREATE TRIGGER update_voters_updated_at
    BEFORE UPDATE ON public.voters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();