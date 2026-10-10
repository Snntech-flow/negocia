-- Tabelas que existiam antes da primeira migration (criadas na época por drizzle-kit push).
-- Só as colunas originais: as migrations seguintes acrescentam o resto com ADD COLUMN IF NOT EXISTS.
-- Em produção tudo já existe; IF NOT EXISTS torna este arquivo inofensivo lá.

-- No Supabase estes papéis existem; num Postgres puro (local/CI) as migrations seguintes precisam deles.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  creci text not null,
  whatsapp text not null,
  password_hash text,
  avatar_url text,
  city text not null,
  state text not null default 'SP',
  role text not null default 'corretor',
  is_verified boolean not null default false,
  verification_status text not null default 'pendente',
  plan text not null default 'pro',
  subscription_status text not null default 'pendente',
  monthly_fee numeric(10, 2) not null default 149.00,
  next_billing_date timestamp,
  trust_score integer not null default 100,
  successful_deals integer not null default 0,
  bypass_reports integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  property_type text not null,
  sale_price numeric(12, 2) not null,
  condo_fee numeric(10, 2),
  iptu numeric(10, 2),
  city text not null,
  neighborhood text not null,
  bedrooms integer not null default 1,
  bathrooms integer not null default 1,
  suites integer not null default 0,
  parking_spots integer not null default 0,
  area_m2 numeric(8, 2) not null,
  description text not null,
  photos jsonb not null default '[]'::jsonb,
  accepts_partnership boolean not null default true,
  split_percentage numeric(5, 2) not null default 50.00,
  confidential_address text not null,
  owner_name text not null,
  owner_phone text not null,
  status text not null default 'disponivel',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.users(id) on delete cascade,
  client_internal_name text not null,
  property_type text not null,
  city text not null,
  neighborhoods jsonb not null default '[]'::jsonb,
  max_budget numeric(12, 2) not null,
  min_bedrooms integer not null default 1,
  min_parking_spots integer not null default 0,
  notes text,
  active boolean not null default true,
  created_at timestamp not null default now()
);

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  captor_broker_id uuid not null references public.users(id),
  partner_broker_id uuid not null references public.users(id),
  status text not null default 'proposta',
  commission_split numeric(5, 2) not null default 50.00,
  visit_scheduled_date timestamp,
  notes text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(10, 2) not null,
  type text not null,
  payment_method text not null,
  status text not null default 'pendente',
  description text not null,
  created_at timestamp not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'ai_match',
  read boolean not null default false,
  property_id uuid references public.properties(id) on delete set null,
  created_at timestamp not null default now()
);

create table if not exists public.dvp_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_hash text not null unique,
  property_id uuid not null references public.properties(id) on delete cascade,
  captor_broker_id uuid not null references public.users(id),
  partner_broker_id uuid not null references public.users(id),
  client_name text not null,
  client_phone text,
  client_cpf_partial text not null,
  visit_date timestamp not null,
  lock_expiration_date timestamp not null,
  commission_split numeric(5, 2) not null default 50.00,
  status text not null default 'rascunho',
  legal_clauses_accepted boolean not null default false,
  created_at timestamp not null default now()
);
