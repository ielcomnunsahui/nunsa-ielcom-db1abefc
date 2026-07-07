
## Current state

- The app is connected to a **new, empty Supabase project** (`nkfdonvsouezpxbgukco`). The previous project (`lxjepsmgbqhjskwxpoyj` in `config.toml`) had all the tables — the new one has none. Every page/edge function will fail until the schema is restored.
- `types.ts` shows no tables. Migrations in `supabase/migrations/*.sql` describe the full historical schema (voters, student_roster, candidates, positions, votes, election_timeline, admin_users, audit_log, voter_otp, voter_biometric, issuance_log, aspirants, aspirant_positions, payment_instructions, application_deadline, plus `is_admin` and `increment_vote_count` functions).
- Current registration is matric + email → OTP or WebAuthn biometric. There's no password. Voter login (`VotersLogin.tsx`) uses matric-based flow, not Supabase Auth.
- Result queries and admin lists use default PostgREST fetches (implicit 1000-row cap).

## What I'll do

### 1. Restore full schema on the new Supabase (no structural changes to existing app expectations)
Run a single migration that recreates every table, enum, function, policy, trigger, grant, realtime publication, and seed row from the old migrations. Adds only:
- `password_hash TEXT` and `auth_user_id UUID` columns on `voters` (nullable, additive — won't break existing code).
- `GRANT` statements per Lovable rules (missing in old migrations).

### 2. New voter registration flow (Register.tsx)
Form fields: **full name, matric number, email, password**.
1. Client validates format.
2. Calls updated `register-voter` edge function which:
   - Verifies matric exists in `student_roster` (admin-uploaded list).
   - Rejects duplicates.
   - Creates a Supabase Auth user (`email` + `password`) via admin API.
   - Inserts row in `voters` with `auth_user_id`, `verified=false`.
   - Sends 6-digit OTP via Resend (existing `send-otp` reused).
3. User enters OTP → `verify-otp` marks `verified=true`.
4. Success screen shows **"Congratulations 🎉"** with confetti/graffiti animation ("You've registered as a voter for the 2026/2027 NUNSA Election").

### 3. Election-day login (VotersLogin.tsx)
Simplify to **email + password** via `supabase.auth.signInWithPassword`. Block login if `voters.verified=false`. Redirect to `/vote` on success.

### 4. Remove 1000-row cap on live counts
- Wrap heavy fetches in a helper that pages via `.range()` in 1000-row chunks OR uses `count: 'exact', head: true` where only a count is needed.
- Update `AdminLiveResults`, `Results.tsx`, `PublicResults.tsx`, `AdminVoters`, `VoterAnalyticsCard` to use the helper. `candidates.vote_count` (incremented by trigger/function) is already O(1) so results tallies remain accurate above 1000/2000 voters.
- Keep realtime subscriptions (already correct) so counts refresh live.

### 5. Preserve everything else
No changes to admin pages, aspirant flow, timeline, candidates, RLS model, or routing. Biometric setup step becomes optional (skippable) since password is now the primary credential; existing WebAuthn endpoint stays functional for anyone who opts in.

## Technical notes

- Migration is idempotent (`IF NOT EXISTS` / `DROP … IF EXISTS`) so re-runs are safe.
- `voters.auth_user_id` links a Supabase Auth user to the voter row; RLS uses `has_role`-style security-definer functions (already present as `is_admin`, `is_voter_owner`).
- Password hashing is handled entirely by Supabase Auth — we never store raw passwords or use the `password_hash` column (kept for future/rollback flexibility; may be dropped later).
- Confetti uses `canvas-confetti` (tiny, no design-system impact).
- Row-limit helper (`fetchAll`) iterates until fewer than 1000 rows return — safe up to any voter count.

## Files touched

- New migration under `supabase/migrations/` (schema restore + additive columns + grants).
- `supabase/functions/register-voter/index.ts` (accept password + name, create auth user).
- `supabase/functions/send-otp/index.ts` (unchanged logic, verified still works).
- `src/pages/Register.tsx` (new fields, confetti success).
- `src/pages/VotersLogin.tsx` (email + password).
- `src/components/BiometricSetup.tsx` (make biometric optional / skip button).
- `src/lib/fetch-all.ts` (new helper), plus imports in results/admin pages.
- `package.json` (`canvas-confetti`).

Shall I proceed?
