-- Create aspirant_positions table with eligibility requirements
CREATE TABLE public.aspirant_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  application_fee DECIMAL(10, 2) NOT NULL,
  min_cgpa DECIMAL(3, 2) NOT NULL,
  eligible_levels TEXT[] NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create aspirants table
CREATE TABLE public.aspirants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  photo_url TEXT,
  full_name TEXT NOT NULL,
  matric TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  level TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Position
  position_id UUID REFERENCES public.aspirant_positions(id) ON DELETE CASCADE NOT NULL,
  why_running TEXT NOT NULL,
  
  -- Academic
  cgpa DECIMAL(3, 2) NOT NULL,
  
  -- Leadership
  leadership_history TEXT NOT NULL,
  
  -- Documents
  referee_form_url TEXT,
  declaration_form_url TEXT,
  payment_proof_url TEXT,
  
  -- Payment & Admin fields
  payment_verified BOOLEAN DEFAULT false,
  payment_verified_at TIMESTAMPTZ,
  payment_verified_by UUID REFERENCES public.admin_users(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_review_status TEXT DEFAULT 'pending',
  admin_review_notes TEXT,
  admin_reviewed_by UUID REFERENCES public.admin_users(id),
  admin_reviewed_at TIMESTAMPTZ,
  
  -- Screening
  screening_scheduled_at TIMESTAMPTZ,
  screening_result TEXT,
  screening_notes TEXT,
  
  -- Conditional acceptance
  conditional_acceptance BOOLEAN DEFAULT false,
  conditional_reason TEXT,
  resubmission_deadline TIMESTAMPTZ,
  
  -- Final promotion
  promoted_to_candidate BOOLEAN DEFAULT false,
  promoted_at TIMESTAMPTZ,
  candidate_id UUID REFERENCES public.candidates(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payment instructions table
CREATE TABLE public.payment_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create application_deadline table
CREATE TABLE public.application_deadline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default aspirant positions
INSERT INTO public.aspirant_positions (name, application_fee, min_cgpa, eligible_levels, description, display_order) VALUES
('President', 15000, 4.0, ARRAY['500L'], 'Lead the student union', 1),
('Vice President', 10000, 3.5, ARRAY['400L'], 'Support the President', 2),
('General Secretary', 8000, 3.5, ARRAY['300L', '400L', '500L'], 'Manage union administration', 3),
('Assistant Gen. Secretary', 6000, 3.5, ARRAY['200L', '300L'], 'Assist the General Secretary', 4),
('Treasurer', 8000, 3.5, ARRAY['400L', '500L'], 'Manage union finances', 5),
('Director of Academic', 6000, 4.0, ARRAY['300L', '400L', '500L'], 'Oversee academic affairs', 6),
('Director of Social', 6000, 3.5, ARRAY['300L', '400L', '500L'], 'Manage social events', 7),
('Director of Sport', 6000, 3.5, ARRAY['300L', '400L', '500L'], 'Coordinate sports activities', 8),
('Director of Welfare', 6000, 3.5, ARRAY['300L', '400L', '500L'], 'Handle student welfare', 9),
('Assistant Director of Academic', 5000, 3.0, ARRAY['200L', '300L'], 'Support academic director', 10),
('Assistant Director of Social', 5000, 3.0, ARRAY['200L', '300L'], 'Support social director', 11),
('Assistant Director of Sport', 5000, 3.0, ARRAY['200L', '300L'], 'Support sport director', 12),
('Assistant Director of Welfare', 5000, 3.0, ARRAY['200L', '300L'], 'Support welfare director', 13),
('PRO I', 6000, 3.5, ARRAY['400L', '500L'], 'Lead public relations', 14),
('PRO II', 5000, 3.0, ARRAY['200L', '300L'], 'Assist public relations', 15);

-- Insert default payment instructions
INSERT INTO public.payment_instructions (account_number, bank_name, account_name, instructions, is_active) VALUES
('7081795658', 'OPAY', 'Awwal Abubakar Sadik', 'Upload payment proof after transfer', true);

-- Enable RLS
ALTER TABLE public.aspirant_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspirants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_deadline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aspirant_positions
CREATE POLICY "Anyone can view open positions" ON public.aspirant_positions
  FOR SELECT USING (is_open = true);

CREATE POLICY "Admins can manage positions" ON public.aspirant_positions
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for aspirants
CREATE POLICY "Anyone can submit applications" ON public.aspirants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Aspirants can view own application" ON public.aspirants
  FOR SELECT USING (email = auth.jwt()->>'email' OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage aspirants" ON public.aspirants
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for payment_instructions
CREATE POLICY "Anyone can view active payment instructions" ON public.payment_instructions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage payment instructions" ON public.payment_instructions
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for application_deadline
CREATE POLICY "Anyone can view active deadline" ON public.application_deadline
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage deadline" ON public.application_deadline
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_aspirant_positions_updated_at
  BEFORE UPDATE ON public.aspirant_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_aspirants_updated_at
  BEFORE UPDATE ON public.aspirants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_instructions_updated_at
  BEFORE UPDATE ON public.payment_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();