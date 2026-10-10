-- Remove as imagens de banco de imagem que o app colocava sozinho, como se fossem do imóvel ou do corretor:
-- - fotos e capa padrão do formulário de imóvel (e a foto que o servidor punha quando não vinha nenhuma);
-- - a mesma foto de perfil dada a todo corretor novo.
-- Só estas URLs exatas; fotos que o corretor colou continuam. updated_at fica igual para não invalidar edições abertas.

update public.properties
set photos = coalesce((
      select jsonb_agg(photo order by position)
      from jsonb_array_elements_text(photos) with ordinality as item(photo, position)
      where photo not in (
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80'
      )
    ), '[]'::jsonb),
    cover_photo = case
      when cover_photo = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80' then null
      else cover_photo
    end
where photos ?| array[
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80'
      ]
   or cover_photo = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80';

update public.users
set avatar_url = null
where avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
