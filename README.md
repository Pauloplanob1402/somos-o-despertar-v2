# Despertar — rede social

Rede social para quem está em jornada de despertar espiritual encontrar
outras pessoas na mesma caminhada. Slogan: **"Onde quem está despertando
se encontra."**

## Status: as 6 etapas concluídas — pronto pra revisão final e deploy

Todas as etapas do plano original estão implementadas e testadas: frontend
componentizado, schema completo do Supabase, autenticação real, mensagens/
notificações em tempo real, feed com ranking + Gemini, e agora moderação de
verdade, Guardados, páginas legais e ajustes de produção.

## Etapa 6 — Produção

### Moderação de verdade

Denunciar, bloquear e ocultar deixaram de ser só um toast — agora gravam
no banco e mudam o que a conta vê:

| Ação | O que acontece |
|---|---|
| **Ocultar** | Some só do SEU feed (`posts_ocultos`). Não afeta mais ninguém. |
| **Bloquear** | Mútuo: nem você vê o conteúdo da pessoa, nem ela vê o seu, em feed, busca, sugestões e mensagens. Gerenciável em Perfil → "Pessoas bloqueadas", com botão de desbloquear. |
| **Denunciar** | Grava motivo (spam, ódio, assédio, imprópria, outro) + detalhe opcional. Só quem denunciou (e a equipe, com uma role própria — fora do escopo deste MVP) consegue ver a denúncia. |

Testei tudo isso contra Postgres de verdade, incluindo os casos que
importam: post de quem foi bloqueado some do feed mas **a pessoa
bloqueada continua enxergando o próprio conteúdo normalmente**; tentar
iniciar conversa com quem bloqueou (ou foi bloqueado) falha; busca e
sugestão de pessoas não trazem quem está bloqueado; e ocultar um post
não afeta o feed de mais ninguém além de quem ocultou.

### Guardados

Funciona de verdade agora — ícone de guardar em cada post, RPC
`listar_meus_salvos()`, com estado (`eu_salvei`) refletido em qualquer
lugar que o post apareça (feed, mesa, perfil).

### Trava simples contra spam

`criar_post()` recusa uma segunda publicação da mesma pessoa antes de
15 segundos. Não é um sistema de rate-limit sofisticado, mas cobre o
caso mais óbvio de abuso a custo zero de infraestrutura.

### PWA e produção

- `app/manifest.ts`, `app/icon.tsx`, `app/apple-icon.tsx` — ícones gerados
  na hora (via `next/og`), sem precisar de nenhum arquivo de imagem
  externo; o app já é instalável ("Adicionar à tela de início").
- `app/robots.ts` — só libera indexação das páginas públicas (`/`,
  `/termos`, `/privacidade`); tudo que exige login fica de fora.
- `next.config.ts` — headers de segurança padrão (`X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- `app/termos` e `app/privacidade` — páginas reais, linkadas no rodapé
  da coluna direita.

### O que ainda fica pra depois (de propósito, fora do escopo de um MVP)

- **Painel de moderação para equipe/staff**: hoje as denúncias ficam
  registradas e visíveis só pra quem denunciou. Revisar e agir sobre
  elas exigiria uma *role* de moderador (RLS específico) e uma tela — dá
  pra construir em cima do que já existe quando houver equipe de verdade.
- **Upload de foto/vídeo**: os botões existem no composer, mas landing
  de mídia precisa do Supabase Storage (bucket + política de upload).
- **Criar grupo** de mensagens pela interface: o schema já suporta desde
  a Etapa 4, só falta o botão.
- **Rate limiting de verdade** (por IP/conta, na borda): a trava de 15s
  em `criar_post` cobre o básico; produção séria normalmente usa algo
  como Vercel Firewall ou Upstash Ratelimit na frente da API.

## Etapa 5 — Algoritmo do feed & Gemini

### O ranking do feed

Fica todo em `supabase/migrations/0012_feed.sql`, na função
`listar_feed()`. É uma pontuação simples e auditável — dá pra explicar
pra qualquer pessoa por que um post apareceu antes de outro:

```
pontuacao = afinidade + engajamento + novidade

afinidade    +3 se eu sigo o autor
             +2 se o post é de uma mesa que eu participo
engajamento  ln(1 + curtidas + 2 × comentários)
novidade     5 × exp(−idade_em_segundos / 43200)   (meia-vida de 12h)
```

Por que assim:
- **log no engajamento** impede que um post com 500 curtidas domine o
  feed pra sempre;
- **comentário pesa o dobro de curtida** porque indica conversa de
  verdade, não só aprovação passiva;
- **decaimento de 12h** garante que o feed não congele nos mesmos
  campeões de sempre.

Testado de verdade contra Postgres: um post viral de 3 dias atrás
(6,82 pts) aparece acima de um post novo de estranho (5,00), mas ainda
abaixo de quem você segue (8,00) — que é exatamente o equilíbrio
desejado. Os pesos estão todos num lugar só, fáceis de ajustar quando
houver uso real.

### Recomendações (sem IA)

Base determinística, em `0013_descoberta.sql`: mesas ordenadas por
quantas pessoas que **você segue** já estão nelas; pessoas ordenadas por
**amigos em comum** (seguido por quem você segue). Nada de caixa-preta.

### Gemini — sempre no backend

A chave fica em `GEMINI_API_KEY`, **sem** o prefixo `NEXT_PUBLIC_`, e
`lib/gemini.ts` é marcado `server-only`: se alguém importar esse arquivo
num componente de cliente por engano, **o build quebra de propósito**.
A chave nunca chega ao navegador.

| Rota | O que faz |
|---|---|
| `POST /api/gemini/resumo` | Resume uma discussão longa (aparece como "Resumir conversa" quando um post tem 3+ comentários) |
| `POST /api/gemini/sugerir-mesas` | Escolhe, entre as mesas que **já existem**, quais combinam com os interesses da pessoa |

Três cuidados que valem notar:
1. **O Gemini não inventa mesas** — ele só escolhe ids do catálogo real, e
   qualquer id que ele devolva fora da lista é descartado no servidor.
2. **Proteção contra injeção de prompt**: comentários entram delimitados e
   marcados explicitamente como dado, não instrução — senão bastaria
   alguém comentar "ignore as instruções acima" pra sequestrar o resumo.
3. **`GEMINI_API_KEY` é opcional**: sem ela, o resumo some e as sugestões
   caem nas mesas mais populares. Nada quebra.

O tom do modelo (`TOM_DESPERTAR`) proíbe explicitamente julgar a
caminhada de alguém, diagnosticar, dar conselho médico/psicológico ou
inventar versículos — que é justamente o que essa comunidade não quer.

## Etapa 4 — Mensagens & notificações em tempo real

Diferente do feed (que continua mockado até a Etapa 5), **mensagens e
notificações já são 100% reais** — gravadas no Postgres via Supabase e
entregues ao vivo via Realtime, sem precisar recarregar a página.

| Arquivo | Papel |
|---|---|
| `supabase/migrations/0009_mensagens_realtime.sql` | Coluna `lido_ate` (pra contar não lidas de verdade) + RPCs `listar_minhas_conversas()`, `marcar_conversa_lida()`, `obter_ou_criar_conversa_pessoa()` |
| `supabase/migrations/0010_realtime.sql` | Liga o Realtime nas tabelas `mensagens` e `notificacoes` |
| `supabase/migrations/0011_notificacoes_rpc.sql` | RPCs `listar_minhas_notificacoes()` (já com nome de quem praticou a ação) e `marcar_todas_notificacoes_lidas()` |
| `context/MensagensContext.tsx` | `useMensagens()` — conversas, mensagens da conversa aberta, enviar mensagem, buscar pessoa por @arroba, iniciar conversa |
| `context/NotificacoesContext.tsx` | `useNotificacoes()` — lista, contador de não lidas, marcar tudo como lido |
| `context/PresenceContext.tsx` | `usePresence()` — quem está com o app aberto agora (Realtime Presence, sem tabela nova) |
| `components/Mensagens.tsx` | Tela de Mensagens reescrita: lista real, indicador online real, busca por @arroba pra começar uma conversa nova |

**Como testar de verdade:** como as mensagens exigem duas contas reais
(não dá pra mandar mensagem pros usuários de exemplo do feed — João,
Maria etc. não existem como contas), abra duas sessões diferentes (duas
abas anônimas, ou uma anônima + uma logada com Google) e use a busca por
@arroba na aba Mensagens pra uma iniciar conversa com a outra. As
mensagens e a contagem de não lidas atualizam ao vivo dos dois lados,
sem F5.

Assim como na Etapa 2, **testei o schema novo rodando de verdade** contra
o Postgres local — iniciar conversa, reutilizar em vez de duplicar,
bloquear autochat, contagem de não lidas certa pra cada lado, marcar como
lida, notificação já com o nome de quem praticou a ação, e isolamento
entre usuários que não participam da conversa.

Uma limitação conhecida: chat em grupo já funciona no schema e na tela,
mas ainda não tem um botão de "criar grupo" na interface — os únicos
grupos possíveis por enquanto são os criados direto no banco. Fica pra
uma iteração futura.

## Etapa 3 — Autenticação

O fluxo é o mesmo do UNSAY: ninguém vê tela de login bloqueando a entrada.
No primeiro acesso, o `middleware.ts` já provisiona uma **sessão anônima**
antes da página carregar (`supabase.auth.signInAnonymously()`), o que
dispara o gatilho da Etapa 2 e cria um perfil (`nome`, `arroba` provisórios)
na hora. A pessoa usa o app normalmente com essa sessão. Quando quiser,
na aba Perfil, pode "reivindicar" a conta com **Google** ou **e-mail** —
é a mesma conta (mesmo `id`, mesmo perfil, mesmo histórico), só deixa de
ser temporária.

| Arquivo | Papel |
|---|---|
| `lib/supabase/client.ts` | Cliente Supabase para Client Components |
| `lib/supabase/server.ts` | Cliente Supabase para Server Components / Route Handlers |
| `lib/supabase/middleware.ts` + `middleware.ts` | Renova a sessão a cada request e provisiona sessão anônima se ninguém estiver logado |
| `context/AuthContext.tsx` | `useAuth()` — expõe `user`, `perfil`, `ehAnonimo`, e as funções `entrarComGoogle`, `enviarLinkPorEmail`, `atualizarPerfil`, `sair` |
| `app/auth/callback/route.ts` | Troca o código do OAuth/e-mail por uma sessão de verdade |
| `components/CompletarCadastro.tsx` | Card na aba Perfil pra reivindicar a conta (some sozinho depois que a pessoa faz isso) |

A Sidebar, o composer e a aba Perfil já usam o perfil **real** vindo do
Supabase (nome, arroba, bio, cor, contadores) em vez do mock `EU` de
antes — inclusive dá pra editar nome/bio ali (grava direto na tabela
`perfis`, respeitando o RLS da Etapa 2). O resto do feed (posts, mesas,
mensagens de outras pessoas) continua com os dados de exemplo até a
Etapa 5.

### Configuração necessária no painel do Supabase

Nenhuma dessas coisas dá pra fazer por código — são ajustes manuais no
dashboard do seu projeto, sem eles o login não funciona:

1. **`.env.local`**: copie `.env.local.example`, preencha com a URL e a
   `anon key` do seu projeto (Project Settings → API).
2. **Authentication → Sign In / Providers → Anonymous Sign-Ins**: ativar.
   Sem isso, `signInAnonymously()` retorna erro e ninguém consegue nem
   abrir o app.
3. **Authentication → Sign In / Providers → Google**: ativar e preencher
   Client ID/Secret de um OAuth Client criado no Google Cloud Console,
   com a Redirect URI `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration → Redirect URLs**: adicionar
   `http://localhost:3000/auth/callback` (dev) e, depois do deploy,
   `https://SEU-DOMINIO.vercel.app/auth/callback`.
5. **E-mail**: o provedor de e-mail padrão do Supabase funciona pra testar,
   mas é limitado (poucos e-mails/hora) — pra produção de verdade, configurar
   um SMTP próprio em Project Settings → Auth → SMTP Settings.

Realtime **não precisa de nenhum passo manual** — a migration
`0010_realtime.sql` já liga as tabelas necessárias na publicação
`supabase_realtime` sozinha.

## Etapa 2 — Schema do Supabase

As migrations estão em `supabase/migrations/`, numeradas na ordem em que
devem ser aplicadas (`supabase db push` ou colando cada uma no SQL Editor
do painel, em ordem). Cada tabela tem RLS (Row Level Security) habilitada
desde a criação — nada fica aberto por padrão.

| Arquivo | Conteúdo |
|---|---|
| `0001_perfis.sql` | Perfis públicos + gatilho que cria o perfil automaticamente quando alguém se cadastra |
| `0002_mesas.sql` | Mesas (comunidades) e quem participa de cada uma |
| `0003_posts_e_interacoes.sql` | Posts (texto/enquete), opções e votos de enquete, curtidas, comentários |
| `0004_seguidores.sql` | Relação de seguir entre perfis |
| `0005_mensagens.sql` | Conversas (1:1 e em grupo), participantes, mensagens |
| `0006_notificacoes.sql` | Notificações (inseridas só por gatilho, nunca direto pelo cliente) |
| `0007_gatilhos.sql` | Gatilhos que mantêm os contadores (curtidas, comentários, seguidores, membros, publicações) e geram notificações automaticamente |
| `0008_indices.sql` | Índices para as consultas mais comuns (feed, perfil, mensagens, notificações, busca) |
| `0009_mensagens_realtime.sql` | (Etapa 4) `lido_ate` + RPCs de conversas |
| `0010_realtime.sql` | (Etapa 4) Liga o Realtime em `mensagens` e `notificacoes` |
| `0011_notificacoes_rpc.sql` | (Etapa 4) RPCs de notificações |
| `0012_feed.sql` | (Etapa 5) Ranking do feed, posts por perfil/mesa, opções de enquete com %, `criar_post` |
| `0013_descoberta.sql` | (Etapa 5) Mesas, membros, pessoas sugeridas, busca, "em alta", comentários |
| `0014_moderacao_e_salvos.sql` | (Etapa 6) Bloqueios, denúncias, posts ocultos, Guardados, trava de spam |

`supabase/seed.sql` já povoa as 5 mesas do protótipo. Perfis e posts de
teste só podem ser criados depois que existir pelo menos um usuário real
no `auth.users` (o gatilho de `0001` cuida de criar o perfil sozinho).

**Todo o schema foi validado rodando de verdade** contra um Postgres 16
local com um `auth.users`/`auth.uid()` simulados — incluindo tentativas
deliberadas de burlar o RLS (postar em nome de outra pessoa, se
autoadicionar numa conversa privada alheia, votar duas vezes na mesma
enquete, seguir a si mesmo, etc.), todas corretamente bloqueadas.

Dois detalhes de design que vale saber ao mexer nisso depois:
- **`conversas.criado_por`**: existe especificamente para o fluxo comum do
  Supabase (`.insert(...).select().single()`) funcionar — sem essa coluna,
  o `RETURNING` do insert falha porque, no momento da criação, ninguém
  ainda é "participante" da conversa.
- **`conversa_participantes`, insert**: só quem criou a conversa pode
  adicionar os participantes iniciais, ou um membro já existente pode
  convidar alguém **só se for um grupo**. De propósito, não existe uma
  regra de "todo mundo pode se autoadicionar" — isso permitiria qualquer
  pessoa entrar numa conversa privada alheia.

## Rodando localmente

```bash
cp .env.local.example .env.local   # preencha com os dados do seu projeto Supabase
npm install
npm run dev
```

Abra http://localhost:3000 — a rota `/` é o onboarding; depois de escolher
pelo menos 3 interesses, você cai em `/inicio`.

## Estrutura

```
app/
  page.tsx                 → onboarding ("/")
  (app)/layout.tsx         → shell persistente (sidebar, rail, nav mobile)
  (app)/inicio/            → feed
  (app)/explorar/          → descobrir mesas e pessoas
  (app)/mesas/             → lista de mesas
  (app)/mesas/[id]/        → mesa individual (publicações, membros, sobre)
  (app)/pessoas/           → lista de pessoas
  (app)/mensagens/         → conversas 1:1 e em grupo
  (app)/notificacoes/
  (app)/guardados/
  (app)/perfil/
  (app)/busca/             → busca com filtro ao vivo
  globals.css              → identidade visual (terracota/dourado, Cormorant Garamond + Inter)

components/                → Sidebar, MobileNav, RightRail, PostCard, MesaCard,
                              PersonRow, ComposeModal, OnboardingFlow, Mensagens,
                              CompletarCadastro, Toast, Avatar, icons.tsx
context/AuthContext.tsx        → sessão, perfil real, reivindicar conta
context/AppContext.tsx         → feed, mesas, moderação e guardados reais
context/MensagensContext.tsx   → conversas e mensagens reais + Realtime
context/NotificacoesContext.tsx→ notificações reais + Realtime
context/PresenceContext.tsx    → quem está online agora
lib/supabase/                  → clientes (browser, server, middleware)
lib/mapeadores.ts              → converte snake_case das RPCs pra camelCase
lib/gemini.ts                  → chamadas ao Gemini (server-only)
lib/constantes.ts              → temas do onboarding
lib/types.ts                   → tipos TypeScript compartilhados
app/api/gemini/                → rotas de IA (resumo, sugerir-mesas)
app/termos, app/privacidade    → páginas legais
app/manifest.ts, icon.tsx      → PWA
supabase/migrations/           → 14 migrations SQL, na ordem de aplicação
supabase/seed.sql              → as 5 mesas iniciais
```

## Checklist antes de lançar de verdade

- [ ] Rodar as 14 migrations + `seed.sql`, nessa ordem, no projeto Supabase de produção
- [ ] Ativar Anonymous Sign-Ins e configurar o provider Google (ver seção de Autenticação acima)
- [ ] Adicionar as Redirect URLs de produção em Authentication → URL Configuration
- [ ] Configurar SMTP próprio (o e-mail padrão do Supabase é limitado)
- [ ] Preencher `GEMINI_API_KEY` na Vercel, se quiser resumo/sugestões por IA
- [ ] Revisar `app/termos` e `app/privacidade` com um advogado antes do lançamento público
- [ ] Definir um canal de contato real (e-mail/formulário) e substituir a menção genérica nas páginas legais
- [ ] Decidir quem revisa as denúncias (`select * from denuncias where status = 'pendente'`) até existir um painel de moderação

### O que fica pra depois, de propósito (fora do escopo deste MVP)

- **Painel de moderação para equipe/staff** — hoje as denúncias ficam
  registradas e visíveis só pra quem denunciou.
- **Upload de foto/vídeo** — os botões existem, falta o Supabase Storage.
- **Criar grupo** de mensagens pela interface — o schema já suporta.
- **Rate limiting na borda** (Vercel Firewall / Upstash) — a trava de 15s
  em `criar_post` cobre só o caso mais básico.
