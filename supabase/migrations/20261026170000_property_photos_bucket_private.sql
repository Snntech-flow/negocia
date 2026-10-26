-- Fotos de imóveis são CONFIDENCIAIS (só quem tem acesso ao imóvel): o bucket deixa de ser público.
-- A exibição passa a usar URLs ASSINADAS curtas geradas no servidor, após as checagens de acesso
-- de cada loader (ver src/lib/photo-sign.ts). Revoga o aviso da auditoria de 26/10/2026: link
-- público eterno mesmo após arquivar o imóvel.
-- Num Postgres sem o Supabase Storage (local/CI) não há o schema storage: nada a fazer.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    update storage.buckets set public = false where id = 'imoveis';
  end if;
end $$;
