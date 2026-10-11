-- Só acrescenta coluna e regra: pode subir antes do código (o código novo lê esta coluna).

-- Previsão de entrega do imóvel em construção ou na planta (pedido da corretora piloto, 11/10/2026). Mês/ano na tela;
-- aqui, o dia 1 do mês. Imóvel pronto ou usado não tem previsão — o banco recusa, qualquer que seja a tela.
alter table public.properties
  add column if not exists delivery_forecast date;

alter table public.properties drop constraint if exists properties_delivery_forecast_check;
alter table public.properties add constraint properties_delivery_forecast_check check (
  delivery_forecast is null
  or (extract(day from delivery_forecast) = 1 and condition in ('em_construcao', 'na_planta'))
);
