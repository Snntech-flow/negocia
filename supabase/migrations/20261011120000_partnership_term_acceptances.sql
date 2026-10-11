-- Termo de Parceria com aceite eletrônico (pedido da corretora piloto, 11/10/2026). Tabela nova: pode subir antes do código.
--
-- Cada corretor aceita o termo da sua parceria: a versão do texto, a versão da divisão da comissão que o termo trouxe, o
-- texto exato que leu e a impressão (sha-256) dele ficam gravados, com data, hora e IP. Mudou a divisão (nova revisão) ou o
-- texto (nova versão, ou o cadastro do imóvel/corretor antes dos dois aceitarem), o aceite anterior não vale para o novo
-- termo — aceita de novo. O termo assinado é o texto gravado: reimprime igual mesmo se o cadastro mudar depois.
-- Assinatura eletrônica simples (Lei 14.063/2020).

create table if not exists public.partnership_term_acceptances (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  user_id uuid not null references public.users(id),
  term_version text not null check (char_length(term_version) between 1 and 20),
  commission_revision integer not null check (commission_revision >= 1),
  text_hash text not null check (text_hash ~ '^[0-9a-f]{64}$'),
  term_text text not null check (char_length(term_text) between 1 and 20000),
  accepted_at timestamp not null default now(),
  ip text check (ip is null or char_length(ip) <= 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 400)
);

-- Um aceite por corretor e texto: a impressão já traz a versão do termo e a revisão da divisão (estão no texto).
create unique index if not exists partnership_term_acceptances_unique
  on public.partnership_term_acceptances (partnership_id, user_id, text_hash);

create index if not exists partnership_term_acceptances_partnership_idx
  on public.partnership_term_acceptances (partnership_id);

-- Só o servidor do NegociaLar acessa; quem pode aceitar (captador ou parceiro da parceria) é conferido na ação.
alter table public.partnership_term_acceptances enable row level security;
revoke all on table public.partnership_term_acceptances from public, anon, authenticated;
drop policy if exists "deny browser api access" on public.partnership_term_acceptances;
create policy "deny browser api access" on public.partnership_term_acceptances
  as restrictive for all to anon, authenticated using (false) with check (false);
