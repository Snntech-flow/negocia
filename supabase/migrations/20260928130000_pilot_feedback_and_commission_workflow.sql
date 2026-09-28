alter table public.partnerships
  add column if not exists commission_status text not null default 'nao_registrada',
  add column if not exists commission_revision integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partnerships_commission_status_check' and conrelid = 'public.partnerships'::regclass) then
    alter table public.partnerships add constraint partnerships_commission_status_check
      check (commission_status in ('nao_registrada', 'aguardando_aceites', 'confirmada', 'recusada'));
  end if;
end $$;

alter table public.users
  add column if not exists session_version integer not null default 0;

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  screen text not null,
  category text not null,
  message text not null,
  status text not null default 'novo',
  reviewed_at timestamp,
  reviewed_by uuid references public.users(id),
  created_at timestamp not null default now(),
  constraint pilot_feedback_category_check check (category in ('duvida', 'erro', 'ideia')),
  constraint pilot_feedback_status_check check (status in ('novo', 'em_analise', 'concluido')),
  constraint pilot_feedback_message_length_check check (length(trim(message)) between 10 and 2000)
);

create index if not exists pilot_feedback_status_created_idx
  on public.pilot_feedback (status, created_at desc);

alter table public.pilot_feedback enable row level security;
revoke all on table public.pilot_feedback from public, anon, authenticated;
drop policy if exists "deny browser api access" on public.pilot_feedback;
create policy "deny browser api access" on public.pilot_feedback
  as restrictive for all to anon, authenticated using (false) with check (false);
