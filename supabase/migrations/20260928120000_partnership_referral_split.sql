alter table public.partnerships
  add column if not exists captor_accepted_at timestamp,
  add column if not exists partner_accepted_at timestamp,
  add column if not exists commission_model text not null default 'two_party_50_50',
  add column if not exists captor_commission_percent numeric(5, 2) not null default 50.00,
  add column if not exists partner_commission_percent numeric(5, 2) not null default 50.00,
  add column if not exists referrer_commission_percent numeric(5, 2) not null default 0.00,
  add column if not exists external_referrer_name text,
  add column if not exists external_referrer_creci text,
  add column if not exists external_referrer_whatsapp text;

alter table public.dvp_certificates
  add column if not exists commission_model text not null default 'two_party_50_50',
  add column if not exists captor_commission_percent numeric(5, 2) not null default 50.00,
  add column if not exists partner_commission_percent numeric(5, 2) not null default 50.00,
  add column if not exists referrer_commission_percent numeric(5, 2) not null default 0.00,
  add column if not exists external_referrer_name text,
  add column if not exists external_referrer_creci text,
  add column if not exists external_referrer_whatsapp text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partnerships_commission_model_check' and conrelid = 'public.partnerships'::regclass) then
    alter table public.partnerships add constraint partnerships_commission_model_check
      check (commission_model in ('two_party_50_50', 'three_party_referral_40_40_20'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'partnerships_commission_percentages_check' and conrelid = 'public.partnerships'::regclass) then
    alter table public.partnerships add constraint partnerships_commission_percentages_check
      check (
        captor_commission_percent >= 0 and
        partner_commission_percent >= 0 and
        referrer_commission_percent >= 0 and
        captor_commission_percent + partner_commission_percent + referrer_commission_percent = 100
        and (
          (commission_model = 'two_party_50_50' and captor_commission_percent = 50 and partner_commission_percent = 50 and referrer_commission_percent = 0)
          or
          (commission_model = 'three_party_referral_40_40_20' and captor_commission_percent = 40 and partner_commission_percent = 40 and referrer_commission_percent = 20 and length(trim(coalesce(external_referrer_name, ''))) >= 2 and length(trim(coalesce(external_referrer_creci, ''))) >= 2)
        )
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dvp_certificates_commission_model_check' and conrelid = 'public.dvp_certificates'::regclass) then
    alter table public.dvp_certificates add constraint dvp_certificates_commission_model_check
      check (commission_model in ('two_party_50_50', 'three_party_referral_40_40_20'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dvp_certificates_commission_percentages_check' and conrelid = 'public.dvp_certificates'::regclass) then
    alter table public.dvp_certificates add constraint dvp_certificates_commission_percentages_check
      check (
        captor_commission_percent >= 0 and
        partner_commission_percent >= 0 and
        referrer_commission_percent >= 0 and
        captor_commission_percent + partner_commission_percent + referrer_commission_percent = 100
        and (
          (commission_model = 'two_party_50_50' and captor_commission_percent = 50 and partner_commission_percent = 50 and referrer_commission_percent = 0)
          or
          (commission_model = 'three_party_referral_40_40_20' and captor_commission_percent = 40 and partner_commission_percent = 40 and referrer_commission_percent = 20 and length(trim(coalesce(external_referrer_name, ''))) >= 2 and length(trim(coalesce(external_referrer_creci, ''))) >= 2)
        )
      );
  end if;
end $$;
