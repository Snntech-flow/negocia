# Negocia Lar

Protótipo de uma rede MLS para corretores. O repositório contém a interface inicial, cadastro de imóveis e perfis de busca, além de registros internos de visita em rascunho.

## Estado atual

- O cadastro exige senha e mantém a sessão em cookie assinado.
- O cadastro inicia 30 dias grátis, sem gerar pagamento inicial. O uso da rede continua dependendo da aprovação manual do CRECI. A área Minha assinatura mostra dias restantes, histórico, renovação via Pix e link/código de indicação.
- A administração precisa conferir o Pix no banco e marcar a transação como paga. A renovação preserva os dias restantes e acrescenta um mês ou um ano conforme o ciclo escolhido. O primeiro pagamento confirmado de cada indicado concede 30 dias ao indicador uma única vez.
- A galeria aceita até 40 URLs de fotos HTTPS por imóvel, com validação no cliente e no servidor.
- Não há integração Pix, gateway, consulta automática ao CRECI ou assinatura eletrônica.
- O registro de visita é um rascunho interno; não promete efeito jurídico nem trava de anterioridade.
- A navegação do painel usa menus suspensos compactos, e cada área explica seu objetivo e os limites dos recursos disponíveis. O termo é uma prévia e o DVP registra somente rascunhos, sem aceite eletrônico.
- O CRM permite cadastrar e editar leads, importar até 100 contatos por CSV (com modelo e deduplicação por telefone), filtrar por etapa, tipo, origem, cidade e retornos, exportar a seleção para CSV, acompanhar atividades, ver a agenda e concluir retornos, baixar os retornos em arquivo `.ics` para importar no calendário, usar uma lista de leads adaptada para celular, conferir sugestões de imóveis com os critérios de compatibilidade explicados e iniciar DVPs em rascunho vinculados ao lead.
- O acompanhamento de parcerias registra mudanças operacionais de etapa e uma linha do tempo com autor e horário, com acesso restrito aos corretores participantes; esses estados não coletam aceite eletrônico nem geram contrato.
- Dados de proprietário e endereço completo só são retornados ao corretor que cadastrou o imóvel. Dados de clientes são limitados à conta proprietária; perfis de busca são compartilhados anonimizados apenas com corretores aprovados.
- As tabelas de usuários, imóveis, perfis, leads, atividades, parcerias, transações, notificações e DVPs têm RLS habilitada e acesso direto da API `anon`/`authenticated` revogado. O app consulta o banco apenas no servidor; as ações validam a sessão e filtram registros privados pelo dono ou participante. Em ambientes novos, aplique as migrações SQL de `supabase/migrations` em ordem cronológica.
- Tentativas de login são limitadas por combinação de e-mail e origem da conexão; cadastros também são limitados por origem. Os contadores são guardados em tabela privada com RLS.

Os fluxos completos de co-corretagem, planos e PDFs ainda precisam de implementação e revisão antes de serem oferecidos como serviço em produção.

## Desenvolvimento local

- PostgreSQL 16: porta `5433` (veja `docker-compose.yml`).
- Node.js 20.9 ou superior, Next.js, React, Drizzle e TypeScript.

```sh
npm install
npm run db:up
npm run db:push
npm run dev
```

Use `npm test`, `npm run lint` e `npm run build` para conferir as validações, a qualidade do código e a compilação de produção. Os testes de autorização entre contas só rodam quando `NEGOCIAR_LAR_TEST_DATABASE_URL` aponta para um banco descartável local cujo nome contenha `test`; eles não aceitam URL do Supabase.

Configure `DATABASE_URL` no `.env.local` para apontar ao banco de desenvolvimento. Sem essa variável, o app usa a conexão local de desenvolvimento definida em `src/lib/db/index.ts`.

Depois da mudança de autenticação, aplique o schema com `npm run db:push` antes de iniciar o app; isso adiciona `users.password_hash`.

## Produção

Configure `DATABASE_URL` e `NEGOCIAR_LAR_SESSION_SECRET` no ambiente do servidor. Gere um segredo forte fora do repositório, por exemplo com `openssl rand -hex 32`. O app encerra a inicialização sem essas variáveis em produção; nunca coloque os valores no Git.

Em hospedagem Vercel, o limite por IP usa o cabeçalho de origem fornecido pela plataforma. Em outras hospedagens, os cadastros usam um limite compartilhado mais conservador até que a aplicação receba a origem por um proxy confiável. Verifique periodicamente no Supabase se todas as tabelas de `public` continuam com RLS ativo e sem privilégios diretos para `anon` e `authenticated`.

Cadastros públicos nunca recebem papel de administrador. Para provisionar o primeiro administrador, use acesso confiável ao banco e promova uma conta cuja identidade já foi verificada. Não execute essa alteração em uma conta sem conferência.

As contas antigas sem `password_hash` não conseguem entrar com senha até que seja feito um fluxo seguro de definição de senha. O projeto ainda não inclui recuperação de senha.

## Dados de demonstração

`src/lib/db/seed.ts` apaga e recria tabelas de demonstração. Por segurança, ele só roda fora de produção e exige `ALLOW_DESTRUCTIVE_NEGOCIAR_LAR_SEED=yes`. Use apenas em um banco descartável.

## Atualização de 1 de outubro de 2026

Antes de executar esta versão em um banco existente, aplique a migração `supabase/migrations/20261001120000_trial_and_subscription_referrals.sql`. Ela acrescenta o ciclo de cobrança e os dados de indicação; mantém as contas existentes e identifica ciclos anuais pelas transações anteriores. Contas antigas ativas sem data de vencimento preservam o acesso anterior. O novo período gratuito aplica-se aos novos cadastros.

A confirmação Pix e o bônus devem ser homologados em banco descartável antes da publicação. Cancelamentos e estornos ainda não têm fluxo automatizado para reverter bônus; exigem revisão operacional.

## Revisão de permissões e carregamento — 7 de outubro de 2026

- Vitrine, DVP e documentação aplicam a mesma regra para imóveis de outros corretores: disponíveis, compartilhados e de captadores aprovados. O captador continua podendo documentar seu próprio inventário privado ou vendido.
- Radar e notificações de cruzamento excluem contas pendentes ou suspensas. A área mostra correspondências reais e explica cidade, tipo, bairro, orçamento, quartos e vagas; a ficha usa o imóvel correspondente.
- A abertura carrega a vitrine, a conta e as notificações. CRM, Radar, visitas e administração carregam seus dados ao abrir a área. Consultas independentes rodam em paralelo.
- A vitrine usa filtros no servidor e páginas de 24 imóveis. A paginação não limita o inventário usado pelo CRM ou pelo Radar. Os filtros continuam acessíveis durante o carregamento e o contador acompanha os dados atuais.
- Autenticação, consultas da área de trabalho, ações do CRM, vitrine e correspondências estão separados em módulos. Os imports públicos de `src/lib/actions.ts` continuam disponíveis.

Use `npm run typecheck` além de lint, testes e build. Para validar as ações em um banco PostgreSQL local descartável, configure `NEGOCIAR_LAR_TEST_DATABASE_URL`, rode `npm run db:test:push` e `npm run test:integration`. A URL precisa apontar para localhost/127.0.0.1/IPv6 local e o nome do banco precisa conter `test`. Nenhum comando de teste usa `.env.local` para escolher o banco.

O workflow `.github/workflows/quality.yml` cria PostgreSQL isolado e executa schema, testes, lint, tipos e build. Nesse workflow, a falta do banco de testes causa falha em vez de pular os testes de autorização. As migrações Supabase continuam sendo a referência para as restrições de acesso direto à API; a suíte entre contas valida as ações do servidor.

A ficha white-label usa o WhatsApp do corretor conectado e permite copiar um resumo ou abrir uma prévia para imprimir/salvar como PDF pelo navegador. Ela não copia links para rotas públicas inexistentes nem simula a geração de PDF.


## Carteira de imóveis e recuperação de senha

Em **Imóveis → Meus imóveis**, o captador pode consultar a própria carteira, editar todos os campos do cadastro e marcar o imóvel como disponível, em negociação, vendido ou arquivado. O arquivamento é reversível e remove o imóvel da vitrine e do Radar, preservando visitas e parcerias. Restaurar um anúncio disponível exige CRECI aprovado e assinatura com acesso válido. Contas com acesso expirado ainda podem editar e arquivar a própria carteira. O servidor verifica a titularidade mesmo para administradores e rejeita uma gravação baseada em versão antiga.

A opção **Esqueci minha senha** envia um link de uso único, válido por 30 minutos. O banco armazena apenas o hash do token. O token vai no fragmento do link e a tela o remove da barra de endereço ao carregar. A troca incrementa `session_version`, invalida sessões anteriores e os demais links de recuperação da conta. Há limites por conta e conexão; as respostas de solicitação não revelam se o e-mail existe.

### Ativar envio de recuperação

1. Aplique `supabase/migrations/20261007180000_password_recovery.sql` no Supabase SQL Editor como proprietário do banco. Essa etapa não é executada pelo build. O código depende da nova tabela quando a recuperação é usada.
2. Configure no ambiente do servidor:

```dotenv
RESEND_API_KEY=chave_do_servico
NEGOCIAR_LAR_EMAIL_FROM=NegociaLar <acesso@seu-dominio.com.br>
NEGOCIAR_LAR_APP_URL=https://seu-dominio.com.br
```

O remetente precisa estar autorizado no Resend. A integração usa a [API oficial de envio de e-mails](https://resend.com/docs/api-reference/emails/send-email). Não coloque essas variáveis em `NEXT_PUBLIC_*`. A origem dos links vem exclusivamente da configuração, nunca do cabeçalho da requisição; em produção deve usar HTTPS. Reinicie o servidor após configurar. Sem essa configuração, a interface mostra indisponibilidade, sem simular entrega.

O envio foi validado com um substituto local do provedor nos testes; configurar a chave e o remetente e testar a entrega real continuam necessários no ambiente de publicação. Falhas do provedor invalidam o novo token e registram um erro sem e-mail nem token nos logs. A infraestrutura deve monitorar essa mensagem.
