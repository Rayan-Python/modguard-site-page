-- feedback_submissions
-- Run this in the Supabase SQL editor (or via `supabase db push`).
--
-- Access model:
--   * Anyone (anon) may INSERT a submission  -> the public contact form works.
--   * No one may SELECT via the public API    -> submissions are NOT publicly
--     readable. Reading requires the service_role key (admin/server context),
--     which bypasses RLS, or an authenticated admin policy you add later.

create table if not exists public.feedback_submissions (
  id          uuid          primary key default gen_random_uuid(),
  created_at  timestamptz   not null    default now(),
  type        text          not null,
  other_type  text,
  name        text,
  email       text,
  message     text          not null
);

alter table public.feedback_submissions enable row level security;

-- Allow inserts from anonymous (and authenticated) visitors.
drop policy if exists "Anyone can submit feedback" on public.feedback_submissions;
create policy "Anyone can submit feedback"
  on public.feedback_submissions
  for insert
  to anon, authenticated
  with check (true);

-- NOTE: intentionally NO select/update/delete policies for anon/authenticated.
-- With RLS enabled and no SELECT policy, the table is not readable through the
-- public API. Read your submissions from the Supabase dashboard or with the
-- service_role key on a trusted server.
