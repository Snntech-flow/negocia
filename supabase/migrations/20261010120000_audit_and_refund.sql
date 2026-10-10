-- Só acrescenta colunas opcionais: pode subir antes do código (o código novo lê estas colunas).

-- Quem da equipe aprovou ou suspendeu o CRECI, e quando.
alter table public.users
  add column if not exists verification_reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists verification_reviewed_at timestamp;

-- Confirmação manual do Pix e o que ela mudou, para o estorno desfazer exatamente isso.
alter table public.transactions
  add column if not exists confirmed_by uuid references public.users(id) on delete set null,
  add column if not exists confirmed_at timestamp,
  add column if not exists previous_billing_date timestamp,
  add column if not exists previous_subscription_status text,
  add column if not exists period_end timestamp,
  add column if not exists referral_rewarded_user_id uuid references public.users(id) on delete set null,
  add column if not exists referral_previous_billing_date timestamp,
  add column if not exists referral_period_end timestamp,
  add column if not exists refunded_by uuid references public.users(id) on delete set null,
  add column if not exists refunded_at timestamp,
  add column if not exists refund_reason text;
