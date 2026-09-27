# Negocia Lar

Protótipo de uma rede MLS para corretores. O repositório contém a interface inicial, cadastro de imóveis e perfis de busca, além de registros internos de visita em rascunho.

## Estado atual

- O cadastro exige senha e mantém a sessão em cookie assinado.
- Novos cadastros ficam pendentes até uma pessoa autorizada verificar o CRECI e confirmar o pagamento.
- Não há integração Pix, gateway, consulta automática ao CRECI ou assinatura eletrônica.
- O registro de visita é um rascunho interno; não promete efeito jurídico nem trava de anterioridade.
- O CRM permite cadastrar e editar leads, acompanhar etapas e atividades, agendar retornos, ver sugestões de imóveis e iniciar DVPs em rascunho vinculados ao lead.
- Dados de proprietário e endereço completo só são retornados ao corretor que cadastrou o imóvel. Dados de clientes são limitados à conta proprietária; perfis de busca são compartilhados anonimizados apenas com corretores aprovados.

Os fluxos completos de co-corretagem, planos e PDFs ainda precisam de implementação e revisão antes de serem oferecidos como serviço em produção.

## Desenvolvimento local

- PostgreSQL 16: porta `5433` (veja `docker-compose.yml`).
- Next.js, React, Drizzle e TypeScript.

```sh
npm install
npm run db:up
npm run db:push
npm run dev
```

Configure `DATABASE_URL` no `.env.local` para apontar ao banco de desenvolvimento. Sem essa variável, o app usa a conexão local de desenvolvimento definida em `src/lib/db/index.ts`.

Depois da mudança de autenticação, aplique o schema com `npm run db:push` antes de iniciar o app; isso adiciona `users.password_hash`.

## Produção

Configure `DATABASE_URL` e `NEGOCIAR_LAR_SESSION_SECRET` no ambiente do servidor. Gere um segredo forte fora do repositório, por exemplo com `openssl rand -hex 32`. O app encerra a inicialização sem essas variáveis em produção; nunca coloque os valores no Git.

Cadastros públicos nunca recebem papel de administrador. Para provisionar o primeiro administrador, use acesso confiável ao banco e promova uma conta cuja identidade já foi verificada. Não execute essa alteração em uma conta sem conferência.

As contas antigas sem `password_hash` não conseguem entrar com senha até que seja feito um fluxo seguro de definição de senha. O projeto ainda não inclui recuperação de senha.

## Dados de demonstração

`src/lib/db/seed.ts` apaga e recria tabelas de demonstração. Por segurança, ele só roda fora de produção e exige `ALLOW_DESTRUCTIVE_NEGOCIAR_LAR_SEED=yes`. Use apenas em um banco descartável.
