-- Remove unique constraint on issuance_token in votes table
-- This allows multiple votes from the same voting session (one vote per position)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_issuance_token_key;