-- Financeiro do corretor: receitas e despesas privadas de cada conta. Tabela nova: pode subir antes do código.

create table if not exists public.broker_finance_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('receita', 'despesa')),
  description text not null check (char_length(description) between 2 and 160),
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  -- Data prevista (vencimento) e data em que recebeu ou pagou; sem data de pagamento = em aberto.
  due_date date not null,
  paid_at date,
  -- Cliente da carteira (opcional): se o lead for apagado, o lançamento fica sem cliente.
  lead_id uuid references public.leads(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists broker_finance_entries_owner_due_idx
  on public.broker_finance_entries (owner_user_id, due_date);

-- Só o servidor do NegociaLar acessa; a autorização por conta fica nas ações.
alter table public.broker_finance_entries enable row level security;
revoke all on table public.broker_finance_entries from public, anon, authenticated;
drop policy if exists "deny browser api access" on public.broker_finance_entries;
create policy "deny browser api access" on public.broker_finance_entries
  as restrictive for all to anon, authenticated using (false) with check (false);
