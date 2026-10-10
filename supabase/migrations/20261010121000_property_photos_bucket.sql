-- Bucket público das fotos de imóveis enviadas pelo corretor (o envio passa pelo servidor do app).
-- Num Postgres sem o Supabase Storage (local/CI) não há o schema storage: nada a fazer.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('imoveis', 'imoveis', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
