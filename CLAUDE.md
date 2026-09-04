@AGENTS.md

# Contexto do projeto

## O que é
Micro-SaaS de gestão para creches de cachorro no Brasil. Vendido por assinatura
mensal para donos de creche. O foco da v1 é resolver duas dores: cobrança
recorrente via Pix e controle de agenda/lotação diária.

O cliente que paga o SaaS é o dono da creche. O cliente da creche é o tutor do pet.

## Idioma
Toda a interface, mensagens de erro e conteúdo visível ao usuário em português do
Brasil. Nomes de tabelas, colunas, variáveis e funções em português também, para
manter coerência com o domínio (tutor, pet, creche, diária). Comentários em português.

## Stack obrigatória
- Next.js (App Router) + TypeScript strict
- Postgres (Neon ou Supabase) via Prisma
- Tailwind + shadcn/ui
- Auth.js para autenticação
- Deploy na Vercel
- Formatação de moeda e data no padrão brasileiro (R$ 1.234,56 · 31/08/2026)
- Valores monetários SEMPRE em centavos (Int), nunca Float

## Regra de ouro: multi-tenant
Cada creche é um tenant. TODA query ao banco filtra por tenantId, sem exceção.
Nunca escreva uma query que possa retornar dados de outro tenant. Se um helper
de acesso a dados não recebe tenantId, ele está errado. Use `lib/tenant.ts`
(helper `comTenant`) para montar o `where` das queries.

## Perfis de usuário
- dono: acesso total
- atendente: agenda e check-in, sem acesso ao financeiro
- tutor: NÃO tem login na v1. Recebe um link público de pagamento por WhatsApp.

## Modelo de dados

tenant          id, nome, cnpj, telefone, capacidadeDiaria, chaveApiAbacate
usuario         id, tenantId, nome, email, senhaHash, papel(dono|atendente)
tutor           id, tenantId, nome, telefone, cpf, email
pet             id, tenantId, tutorId, nome, raca, porte, castrado, observacoes, fotoUrl
plano           id, tenantId, nome, tipo(mensal|pacote), valorCentavos,
                qtdDiarias, diaVencimento
assinatura      id, tenantId, petId, planoId, status(ativa|pausada|cancelada),
                dataInicio, saldoDiarias
cobranca        id, tenantId, assinaturaId, competencia, valorCentavos, vencimento,
                status(pendente|paga|vencida|cancelada), abacateBillingId,
                urlPagamento, token, pagoEm
agendamento     id, tenantId, petId, data, status(agendado|presente|saiu|falta),
                checkInEm, checkOutEm
vacina          id, tenantId, petId, tipo, aplicadaEm, venceEm
eventoWebhook   id, provedorEventoId (unique), recebidoEm, payload

Schema completo em `prisma/schema.prisma`.

## Pagamentos — AbacatePay
Gateway brasileiro de Pix. Documentação em docs.abacatepay.com.

Arquitetura crítica: cada creche tem a PRÓPRIA conta AbacatePay. A chave de API
dela fica em tenant.chaveApiAbacate e é usada para cobrar os tutores daquela
creche. A conta do desenvolvedor NÃO intermedeia esse dinheiro — ela serve só
para cobrar a assinatura do SaaS, e isso fica fora do escopo da v1.

Regras do webhook:
- Validar a assinatura do header antes de processar qualquer coisa
- Idempotência obrigatória: gravar provedorEventoId na tabela eventoWebhook e
  ignorar eventos repetidos. O provedor reenvia eventos, isso é esperado.
- Responder 200 rápido, processar o resto depois
- Ao confirmar pagamento de plano tipo pacote, creditar qtdDiarias em
  assinatura.saldoDiarias — uma única vez, mesmo com evento duplicado

Envio de cobrança na v1 é MANUAL: um botão que abre wa.me com a mensagem pronta
contendo o link. Não integrar API oficial de WhatsApp.

## Comportamentos não documentados da AbacatePay
- Chave de dev (`abc_dev_...`) retorna 401 "Insufficient permissions" ao
  deletar webhook (`POST /webhooks/delete`), mesmo criando e listando
  webhooks normalmente com a mesma chave. Não está na documentação;
  confirmado com chamada direta à API, fora do código do projeto. Por causa
  disso, `garantirWebhookConfigurado` (lib/configuracoes.ts) trata falha ao
  deletar webhook antigo como best-effort — nunca bloqueia a criação do
  novo. Testado em setembro/2026; vale reconferir com chave de produção.

## Página pública de pagamento
Rota /pagar/[token], sem autenticação. O token é aleatório e longo (crypto,
mínimo 32 caracteres) — nunca use o id sequencial da cobrança na URL, isso
permite enumerar cobranças de outros clientes. A página expira depois de paga.

## Fora do escopo da v1 — não implemente
- App mobile nativo (é web responsivo)
- Relatório diário com foto do pet (é a v2)
- Banho e tosa, petshop, venda de produtos
- Prontuário veterinário
- Financeiro completo, DRE, contas a pagar
- Múltiplas unidades por tenant
- Cartão de crédito (só Pix na v1)

## Como quero que você trabalhe
- Uma etapa por vez. Não adiante trabalho de etapas futuras.
- Antes de codar algo grande, me mostre o plano em 5 linhas e espere confirmação.
- Mobile-first: a atendente usa isso no celular, em pé, com um cachorro puxando
  a coleira. Botões grandes, poucas telas, nada de menu com dez opções.
- Sem dados fake espalhados pelo código. Se precisar de dados de exemplo, use
  um seed script separado.
- Nunca commite .env. Chaves de API só em variável de ambiente.
- Explique decisões técnicas em português, de forma direta. Sou desenvolvedor
  web mas estou construindo meu primeiro SaaS.
