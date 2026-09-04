# Pendências antes de um cliente pagante de verdade

Levantado na revisão de produção (etapa 6). Os itens abaixo foram
resolvidos nessa etapa: cron diário de cobrança, redefinição de senha de
atendente, rate limit em login/cadastro. O que segue foi adiado de
propósito — combinado que fica pra depois do CNPJ.

## Banco de dev = banco de produção

O Neon que a Vercel está usando agora em produção é literalmente o mesmo
`DATABASE_URL` usado em desenvolvimento local. O tenant real de teste
(cobrança paga de verdade, webhook funcionando) está misturado com
qualquer dado de teste que ainda vier a ser criado localmente.

Antes de um cliente pagante: criar um branch/projeto Neon separado só
pra produção, migrar os dados reais pra lá, e passar a apontar
`DATABASE_URL` da Vercel pra esse branch (o dev local continua no de
sempre).

## Chave de produção da AbacatePay nunca foi testada

Todo o fluxo até aqui (webhook, geração de cobrança, checkout) rodou com
chave de teste (`abc_dev_...`). Duas coisas especificamente marcadas
como "reconferir com chave de produção" durante o desenvolvimento:

- Permissão de deletar webhook (`POST /webhooks/delete`) retornava 401
  "Insufficient permissions" com a chave dev — não confirmado se isso é
  específico de chave de teste ou também acontece em produção. Se
  acontecer em produção também, `garantirWebhookConfigurado` já trata
  como best-effort (não bloqueia), mas webhooks antigos vão se acumular
  no painel da AbacatePay do cliente até alguém limpar manualmente.
- Todo o fluxo de assinatura HMAC/Standard Webhooks foi validado contra
  eventos reais da AbacatePay, mas só em modo dev (`devMode: true` no
  payload) — vale repetir o teste ponta a ponta (cobrança → pagamento →
  webhook → baixa) com uma chave de produção real antes do primeiro
  cliente.

## Sem monitoramento/alerta

Se o webhook parar de confirmar pagamento silenciosamente — como ficou
por várias rodadas durante o desenvolvimento, cada vez com um motivo
diferente — hoje ninguém saberia sem entrar manualmente no log da
Vercel. Recomendado: Sentry (ou similar) pelo menos nas rotas
`/api/webhooks/abacatepay` e `/api/cron/cobrancas`.

## Sem CI

Testes, lint e build só rodam quando alguém lembra de rodar local antes
do push. Recomendado: GitHub Actions rodando `npm test` + `npm run
lint` + `npm run build` em cada PR/push, barrando merge se algo quebrar.

## LGPD

O sistema guarda CPF, telefone e nome de tutores, e observações sobre
pets (potencialmente incluindo questões de saúde). Antes de operar com
clientes reais: política de privacidade acessível no app, base legal
documentada pro tratamento desses dados, e um caminho pro tutor pedir
exclusão dos próprios dados (hoje não existe — só o dono consegue
excluir um tutor pela tela, e só se não houver vínculo ativo).

## Outros, menor prioridade

- `npm audit`: 3 vulnerabilidades "high" em dependências do Prisma CLI
  (`@prisma/config` / `deepmerge-ts`, via `devDependencies` — não afeta
  o runtime da aplicação, só as ferramentas de desenvolvimento).
- `tenantPorWebhookSecret` (lib/configuracoes.ts) decifra e compara o
  secret de TODOS os tenants com webhook configurado, um por um — aceitável
  agora, mas revisitar (ex: hash determinístico indexado) se o número de
  creches crescer além de algumas dezenas.
- Sem fluxo de "esqueci minha senha" pro DONO — só o atendente tem
  redefinição pela UI agora (dono redefine a de quem é atendente). Se o
  dono esquecer a própria senha, hoje só resetando direto no banco via
  script (não existe comando pronto pra isso — pediria um script pontual
  na hora, seguindo o padrão dos scripts temporários usados durante o
  desenvolvimento). Fica assim de propósito até existir serviço de
  e-mail pra um fluxo de recuperação de verdade.
- Rate limit de `/login` e `/cadastro` é em memória, por processo (ver
  `lib/limitador-taxa.ts`) — não é uma trava de verdade em produção
  serverless (cada instância da Vercel tem seu próprio contador, reseta
  em cold start). Segura o caso óbvio de martelar a mesma instância;
  não impede um ataque distribuído ou persistente. Se algum dia isso
  importar de verdade, trocar por Upstash Redis (ou similar) com estado
  compartilhado entre instâncias.
- `ngrok.exe` que estava solto na raiz do projeto: removido.
