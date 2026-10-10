-- Só acrescenta colunas e índice: pode subir antes do código (o código novo lê estas colunas).

-- Ao fechar a parceria: valor total da comissão e data prevista para receber.
alter table public.partnerships
  add column if not exists commission_total numeric(12, 2) check (commission_total is null or commission_total > 0),
  add column if not exists commission_expected_date date;

-- Previsão "a receber" gerada no Financeiro de cada corretor pelo fechamento: no máximo uma por corretor e parceria.
alter table public.broker_finance_entries
  add column if not exists partnership_id uuid references public.partnerships(id) on delete set null;
create unique index if not exists broker_finance_entries_owner_partnership_unique
  on public.broker_finance_entries (owner_user_id, partnership_id) where partnership_id is not null;
