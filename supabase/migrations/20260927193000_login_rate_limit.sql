create table if not exists public.auth_login_attempts (
  key_hash text primary key,
  attempts integer not null default 0,
  blocked_until timestamp,
  updated_at timestamp not null default now()
);

alter table public.auth_login_attempts enable row level security;
revoke all on table public.auth_login_attempts from public, anon, authenticated;
create policy "deny browser api access" on public.auth_login_attempts
  as restrictive for all to anon, authenticated using (false) with check (false);
