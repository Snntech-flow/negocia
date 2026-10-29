-- Tabela nova: sobe ANTES do código (o código novo lê e grava public.seen_matches).

-- Botão "Match" (Sidney, 28/10/2026: "toda vez que tivesse um match ele ficava vermelho, e dentro dele os matches; quando
-- entrasse aparecia 'você já tem 8 matches', pro corretor ver que funciona"). O match é calculado na hora (os critérios do
-- Radar); aqui fica só QUAIS matches o corretor já viu, para o botão contar os novos. Fica no banco, e não no navegador,
-- para o celular e o computador do corretor concordarem.
--   · uma linha por corretor + procura (buyer_profiles) + imóvel (properties);
--   · procura ou imóvel apagado leva a linha junto (on delete cascade);
--   · um match que some e volta (o imóvel saiu e voltou a ficar disponível) continua visto.
create table if not exists public.seen_matches (
  user_id uuid not null references public.users(id) on delete cascade,
  buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  seen_at timestamp not null default now(),
  constraint seen_matches_pkey primary key (user_id, buyer_profile_id, property_id)
);

-- Só o servidor do NegociaLar acessa; o corretor só marca como visto o match que é dele (conferido na ação).
alter table public.seen_matches enable row level security;
revoke all on table public.seen_matches from public, anon, authenticated;
drop policy if exists "deny browser api access" on public.seen_matches;
create policy "deny browser api access" on public.seen_matches
  as restrictive for all to anon, authenticated using (false) with check (false);
