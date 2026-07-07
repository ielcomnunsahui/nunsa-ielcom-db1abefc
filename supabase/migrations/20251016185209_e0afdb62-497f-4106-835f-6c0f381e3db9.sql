-- Create custom types
CREATE TYPE election_stage AS ENUM ('registration', 'voting', 'closed', 'results_published');
CREATE TYPE vote_type AS ENUM ('single', 'multiple');

-- Student roster table (pre-approved students for cross-checking)
CREATE TABLE public.student_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matric TEXT UNIQUE NOT NULL CHECK (matric ~ '^\d{2}/\d{2}[A-Za-z]{3}\d{3}$'),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Voters table (identity information)
CREATE TABLE public.voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matric TEXT UNIQUE NOT NULL CHECK (matric ~ '^\d{2}/\d{2}[A-Za-z]{3}\d{3}$'),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    voted BOOLEAN DEFAULT false,
    issuance_token UUID UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Candidates table
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,
    picture_url TEXT,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Positions table (to configure single vs multiple choice)
CREATE TABLE public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    vote_type vote_type DEFAULT 'single',
    max_selections INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Votes table (anonymous vote records)
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuance_token UUID NOT NULL UNIQUE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Issuance log (audit trail - highly restricted)
CREATE TABLE public.issuance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuance_token UUID NOT NULL,
    voter_id UUID REFERENCES public.voters(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT now()
);

-- Election timeline table
CREATE TABLE public.election_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users table
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table (immutable)
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    description TEXT,
    actor_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issuance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voters table
CREATE POLICY "Voters can view own record" ON public.voters
    FOR SELECT USING (auth.uid() IS NOT NULL AND matric = (SELECT matric FROM public.voters WHERE id = auth.uid()));

CREATE POLICY "Allow voter registration" ON public.voters
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Voters can update own record" ON public.voters
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for candidates (public read)
CREATE POLICY "Anyone can view candidates" ON public.candidates
    FOR SELECT USING (true);

-- RLS Policies for positions (public read)
CREATE POLICY "Anyone can view positions" ON public.positions
    FOR SELECT USING (true);

-- RLS Policies for votes (public read for aggregated data)
CREATE POLICY "Anyone can view votes" ON public.votes
    FOR SELECT USING (true);

-- RLS Policies for election timeline (public read)
CREATE POLICY "Anyone can view timeline" ON public.election_timeline
    FOR SELECT USING (true);

-- Issuance log is highly restricted - only backend functions can access
CREATE POLICY "No direct access to issuance log" ON public.issuance_log
    FOR SELECT USING (false);

-- Audit log read-only for admins
CREATE POLICY "Admins can view audit log" ON public.audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voters_updated_at
    BEFORE UPDATE ON public.voters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert demo data
INSERT INTO public.student_roster (matric, name) VALUES 
    ('21/08nus014', 'Awwal Abubakar Sadik'),
    ('22/08nus068', 'Abubakri Farouq Oluwafunmilayo');

INSERT INTO public.voters (matric, name, email, verified, voted) VALUES 
    ('21/08nus014', 'Awwal Abubakar Sadik', 'demo1@gmail.com', true, false),
    ('22/08nus068', 'Abubakri Farouq Oluwafunmilayo', 'demo2@gmail.com', true, false);

-- Enable realtime for votes table (for live dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;