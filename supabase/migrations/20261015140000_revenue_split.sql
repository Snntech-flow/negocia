-- Tabelas novas: podem subir antes do código.

-- Repasses dos sócios (pedido do Sidney, 15/10/2026: "uma área com as comissões de cada, os % de repasse — Sócio 1,
-- Sócio 2, Sócio 3, Empresa", lá na Administração). Os % valem sobre o faturamento das assinaturas da plataforma.
-- Cada mudança é uma VERSÃO que vale a partir de um mês; os meses anteriores continuam com o % da época (decisão do
-- Sidney). As garantias são do banco, não da tela:
--   · a soma das partes de cada versão é 100% (conferida no fim da transação);
--   · versão de mês que já passou não muda nem some;
--   · versão nova num mês passado só antes da primeira versão (preencher o começo, sem mexer no que já valia).

create table if not exists public.revenue_split_versions (
  id uuid primary key default gen_random_uuid(),
  valid_from_month date not null check (extract(day from valid_from_month) = 1),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp not null default now(),
  constraint revenue_split_versions_month_unique unique (valid_from_month)
);

create table if not exists public.revenue_split_shares (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.revenue_split_versions(id) on delete cascade,
  position integer not null check (position between 1 and 10),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null check (kind in ('socio', 'empresa')),
  percent numeric(5, 2) not null check (percent > 0 and percent <= 100),
  constraint revenue_split_shares_position_unique unique (version_id, position)
);

-- Primeiro dia do mês corrente no horário de Brasília.
create or replace function public.revenue_split_mes_atual() returns date
language sql stable set search_path = public as $$
  select date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date
$$;

-- Mês passado não muda: versão de mês anterior ao atual não pode ser alterada nem apagada (nem as partes dela). As partes
-- de uma versão criada NESTA transação podem entrar (a primeira regra pode começar num mês passado — ver abaixo).
create or replace function public.revenue_split_protege_passado() returns trigger
language plpgsql set search_path = public as $$
declare v_mes date; v_criada timestamp;
begin
  if tg_table_name = 'revenue_split_versions' then
    v_mes := old.valid_from_month;
  else
    select valid_from_month, created_at into v_mes, v_criada from public.revenue_split_versions where id = coalesce(new.version_id, old.version_id);
    if tg_op = 'INSERT' and v_criada = now()::timestamp then return new; end if;
  end if;
  if v_mes is not null and v_mes < public.revenue_split_mes_atual() then
    raise exception 'O repasse de um mês que já passou não muda: crie a regra nova a partir do mês atual.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists revenue_split_versions_passado on public.revenue_split_versions;
create trigger revenue_split_versions_passado before update or delete on public.revenue_split_versions
  for each row execute function public.revenue_split_protege_passado();
drop trigger if exists revenue_split_shares_passado on public.revenue_split_shares;
create trigger revenue_split_shares_passado before insert or update or delete on public.revenue_split_shares
  for each row execute function public.revenue_split_protege_passado();

-- Versão nova num mês passado só antes da primeira versão (preenche o começo; não troca o % que já valia).
create or replace function public.revenue_split_nova_versao() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.valid_from_month < public.revenue_split_mes_atual()
     and exists (select 1 from public.revenue_split_versions v where v.valid_from_month <= new.valid_from_month and v.id <> new.id) then
    raise exception 'Já há repasse definido para esse mês: a regra nova vale a partir do mês atual.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists revenue_split_versions_nova on public.revenue_split_versions;
create trigger revenue_split_versions_nova before insert on public.revenue_split_versions
  for each row execute function public.revenue_split_nova_versao();

-- A soma das partes de cada versão é 100% — conferida no fim da transação (dá para gravar a versão e as partes juntas).
create or replace function public.revenue_split_confere_soma() returns trigger
language plpgsql set search_path = public as $$
declare v_versao uuid; v_soma numeric;
begin
  if tg_table_name = 'revenue_split_versions' then v_versao := new.id;
  else v_versao := coalesce(new.version_id, old.version_id);
  end if;
  if not exists (select 1 from public.revenue_split_versions where id = v_versao) then return null; end if;
  select coalesce(sum(percent), 0) into v_soma from public.revenue_split_shares where version_id = v_versao;
  if v_soma <> 100 then
    raise exception 'Os %% de repasse precisam somar 100%% (deu %).', v_soma using errcode = 'check_violation';
  end if;
  return null;
end $$;

drop trigger if exists revenue_split_versions_soma on public.revenue_split_versions;
create constraint trigger revenue_split_versions_soma after insert on public.revenue_split_versions
  deferrable initially deferred for each row execute function public.revenue_split_confere_soma();
drop trigger if exists revenue_split_shares_soma on public.revenue_split_shares;
create constraint trigger revenue_split_shares_soma after insert or update or delete on public.revenue_split_shares
  deferrable initially deferred for each row execute function public.revenue_split_confere_soma();

-- Só o servidor do NegociaLar acessa; quem vê (administração e visualização) e quem grava (administrador) é da ação.
alter table public.revenue_split_versions enable row level security;
alter table public.revenue_split_shares enable row level security;
revoke all on table public.revenue_split_versions from public, anon, authenticated;
revoke all on table public.revenue_split_shares from public, anon, authenticated;
drop policy if exists "deny browser api access" on public.revenue_split_versions;
create policy "deny browser api access" on public.revenue_split_versions
  as restrictive for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny browser api access" on public.revenue_split_shares;
create policy "deny browser api access" on public.revenue_split_shares
  as restrictive for all to anon, authenticated using (false) with check (false);
