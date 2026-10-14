-- Só acrescenta colunas, regras e gatilho: pode subir antes do código (o código novo lê estas colunas; o antigo continua
-- funcionando no intervalo entre a migration e o deploy).

-- Condição de parceria do imóvel (pedido da corretora piloto, 14/10/2026): o captador diz se aquele imóvel faz parceria
-- SÓ 50/50, SÓ 40/40/20 ou as DUAS — quem busca já sabe antes de entrar em contato. Os imóveis que já existem ficam com as
-- duas (o que o sistema sempre permitiu) e o captador é chamado a revisar.
alter table public.properties
  add column if not exists partnership_models text not null default 'ambos',
  -- quando o captador confirmou que o imóvel aceita parceria nas condições informadas (publicar na rede exige)
  add column if not exists partnership_confirmed_at timestamptz,
  -- imóvel na rede sem confirmação (os anteriores a hoje e o que o código antigo criar no intervalo): o captador revisa
  add column if not exists partnership_review_pending boolean not null default true;

alter table public.properties drop constraint if exists properties_partnership_models_check;
alter table public.properties add constraint properties_partnership_models_check
  check (partnership_models in ('50_50', '40_40_20', 'ambos'));

-- Na vitrine: confirmado pelo captador, ou ainda na revisão pendente.
alter table public.properties drop constraint if exists properties_partnership_confirmed_check;
alter table public.properties add constraint properties_partnership_confirmed_check
  check (not accepts_partnership or partnership_confirmed_at is not null or partnership_review_pending);

-- A divisão da parceria e do registro de visita respeita a condição do imóvel — qualquer que seja a tela.
create or replace function public.divisao_respeita_condicao_do_imovel() returns trigger
language plpgsql set search_path = public as $$
declare v_condicao text;
begin
  select partnership_models into v_condicao from public.properties where id = new.property_id;
  if v_condicao = '50_50' and new.commission_model <> 'two_party_50_50' then
    raise exception 'Este imóvel só faz parceria 50/50.' using errcode = 'check_violation';
  elsif v_condicao = '40_40_20' and new.commission_model <> 'three_party_referral_40_40_20' then
    raise exception 'Este imóvel só faz parceria 40/40/20.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists divisao_respeita_condicao on public.partnerships;
create trigger divisao_respeita_condicao before insert or update of commission_model, property_id on public.partnerships
  for each row execute function public.divisao_respeita_condicao_do_imovel();

drop trigger if exists divisao_respeita_condicao on public.dvp_certificates;
create trigger divisao_respeita_condicao before insert or update of commission_model, property_id on public.dvp_certificates
  for each row execute function public.divisao_respeita_condicao_do_imovel();
