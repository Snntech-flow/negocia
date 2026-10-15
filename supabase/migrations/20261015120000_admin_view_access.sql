-- Só acrescenta colunas: pode subir antes do código (o código novo lê estas colunas; o antigo não as conhece).

-- Visualização da Administração (pedido do Sidney, 15/10/2026: "a aba administrativa para a Gabriela e a Natália —
-- somente em modo visualização"). Quem tem o acesso vê a aba Corretores e pagamentos em modo LEITURA; aprovar,
-- suspender, isentar, confirmar e estornar continuam só do administrador (as ações conferem role = 'admin'). É um
-- acesso separado do papel: não amplia a Vitrine nem os registros de visita como o administrador. Grava quem liberou
-- e quando, como a isenção de cobrança.
alter table public.users
  add column if not exists admin_view_access boolean not null default false,
  add column if not exists admin_view_access_by uuid references public.users(id) on delete set null,
  add column if not exists admin_view_access_at timestamp;
