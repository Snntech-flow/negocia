-- Coluna nova: sobe ANTES do código (o código novo lê users.price_table).

-- Tabela de preços da conta (⚖️ Sidney, 28/10/2026): a tabela de planos mudou (20 = 119,90 · 35 = 189,90 · 50 = 229,90 e
-- o plano novo de 100 = 399,90) e "quem já assina mantém o preço atual". A renovação gerava o Pix pelo preço da tabela do
-- dia — sem esta coluna, trocar a tabela subiria a próxima cobrança de quem já paga.
--   · 'v1' = a tabela de antes de 28/10/2026 — TODA conta que já existe fica nela (é o padrão no instante em que a coluna
--     nasce, então o ALTER preenche as linhas que existem);
--   · 'v2' = a tabela nova — padrão para as contas criadas daqui em diante.
-- Os valores de cada tabela moram em src/lib/plans.ts. Reajuste futuro = tabela nova lá + o padrão novo aqui.
alter table public.users add column if not exists price_table text not null default 'v1';
alter table public.users alter column price_table set default 'v2';

do $$
begin
  alter table public.users add constraint users_price_table_check check (price_table in ('v1', 'v2'));
exception when duplicate_object then null;
end $$;
