-- Dados de demonstração da Conta Piloto saem da rede (pedido do Sidney, 10/10/2026): com corretores de verdade
-- usando, o imóvel "DEMO" e as procuras de exemplo apareciam para todos na Vitrine e no Radar.
-- Não apaga: o imóvel vai para "arquivado" (some da Vitrine) e as procuras ficam inativas (somem do Radar).
-- Só mexe na conta piloto@negocialar.com.br; se ela não existir, não faz nada.
update public.properties
   set status = 'arquivado', updated_at = now()
 where broker_id = (select id from public.users where email = 'piloto@negocialar.com.br')
   and status <> 'arquivado';

update public.buyer_profiles
   set active = false
 where broker_id = (select id from public.users where email = 'piloto@negocialar.com.br')
   and active;
