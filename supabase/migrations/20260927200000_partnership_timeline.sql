create table if not exists public.partnership_activities (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  actor_user_id uuid not null references public.users(id) on delete cascade,
  previous_status text,
  new_status text not null,
  note text,
  created_at timestamp not null default now()
);

create index if not exists partnership_activities_timeline_idx
  on public.partnership_activities (partnership_id, created_at);

alter table public.partnership_activities enable row level security;
revoke all on table public.partnership_activities from public, anon, authenticated;
create policy "deny browser api access" on public.partnership_activities
  as restrictive for all to anon, authenticated using (false) with check (false);
