-- Insert demo positions
INSERT INTO public.positions (name, vote_type, max_selections, display_order) VALUES 
  ('President', 'single', 1, 1),
  ('Vice President', 'single', 1, 2),
  ('Secretary General', 'single', 1, 3),
  ('Financial Secretary', 'single', 1, 4),
  ('Public Relations Officer', 'single', 1, 5);

-- Insert demo candidates
INSERT INTO public.candidates (full_name, position, vote_count) VALUES 
  ('Aisha Mohammed', 'President', 0),
  ('Ibrahim Adewale', 'President', 0),
  ('Fatima Hassan', 'Vice President', 0),
  ('Yusuf Bello', 'Vice President', 0),
  ('Zainab Abdullahi', 'Secretary General', 0),
  ('Ahmad Suleiman', 'Secretary General', 0),
  ('Maryam Usman', 'Financial Secretary', 0),
  ('Khalid Ibrahim', 'Financial Secretary', 0),
  ('Hauwa Garba', 'Public Relations Officer', 0),
  ('Bashir Umar', 'Public Relations Officer', 0);

-- Insert demo timeline (voting opens in future)
INSERT INTO public.election_timeline (stage_name, start_time, end_time, is_active) VALUES 
  ('Registration Period', '2025-11-01T00:00:00Z', '2025-11-30T23:59:59Z', true),
  ('Voting Period', '2025-12-01T00:00:00Z', '2025-12-07T23:59:59Z', true),
  ('Results Publication', '2025-12-08T00:00:00Z', '2025-12-31T23:59:59Z', true);