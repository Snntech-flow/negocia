-- Só acrescenta colunas opcionais: pode subir antes do código (o código novo lê estas colunas).

-- Conta sem cobrança (sócios, cortesia): quem da equipe isentou e quando.
alter table public.users
  add column if not exists billing_exempt_by uuid references public.users(id) on delete set null,
  add column if not exists billing_exempt_at timestamp;
