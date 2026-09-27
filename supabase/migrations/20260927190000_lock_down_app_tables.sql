-- All database access is performed by the authenticated Next.js server.
-- The browser must never query these tables directly with anon/authenticated keys.
-- RLS with no permissive policies denies PostgREST access; the server's
-- DATABASE_URL role remains responsible for per-user authorization in actions.ts.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users',
    'properties',
    'buyer_profiles',
    'leads',
    'lead_activities',
    'partnerships',
    'transactions',
    'notifications',
    'dvp_certificates'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
  end loop;
end $$;

-- Explicit deny policies make the intended behavior visible in Supabase's
-- policy editor and protect against future table grants to these API roles.
create policy "deny browser api access" on public.users
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.properties
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.buyer_profiles
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.leads
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.lead_activities
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.partnerships
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.transactions
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.notifications
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "deny browser api access" on public.dvp_certificates
  as restrictive for all to anon, authenticated using (false) with check (false);
