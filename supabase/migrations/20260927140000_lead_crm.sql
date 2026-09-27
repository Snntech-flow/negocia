create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  normalized_phone text not null,
  email text,
  lead_type text not null default 'comprador',
  stage text not null default 'novo',
  source text not null default 'outro',
  property_type text,
  city text,
  neighborhoods jsonb not null default '[]'::jsonb,
  max_budget numeric(12, 2),
  min_bedrooms integer,
  notes text,
  next_action text,
  next_action_at timestamp,
  last_contact_at timestamp,
  lost_reason text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists leads_owner_stage_idx
  on public.leads (owner_user_id, stage);

create index if not exists leads_owner_action_idx
  on public.leads (owner_user_id, next_action_at);

create unique index if not exists leads_owner_phone_unique
  on public.leads (owner_user_id, normalized_phone);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null,
  description text not null,
  occurred_at timestamp not null default now(),
  created_at timestamp not null default now()
);

create index if not exists lead_activities_timeline_idx
  on public.lead_activities (lead_id, occurred_at);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

revoke all on public.leads from anon, authenticated;
revoke all on public.lead_activities from anon, authenticated;
