alter table public.dvp_certificates
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists dvp_certificates_lead_idx
  on public.dvp_certificates (lead_id);
