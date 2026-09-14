# Despertar — rede social

Rede social para quem está em jornada de despertar espiritual encontrar
outras pessoas na mesma caminhada. Slogan: **"Onde quem está despertando
se encontra."**

## Status: Etapas 1, 2 e 3 concluídas — Frontend, Schema e Autenticação

Este projeto porta o protótipo estático (HTML/CSS/JS) para uma aplicação
Next.js real, componentizada, com rotas próprias, schema completo do banco
(Supabase/Postgres) e autenticação real funcionando (sessão anônima → conta
permanente). **O conteúdo do feed ainda é mockado** (`lib/mock-data.ts`) —
isso é trocado por dados reais na Etapa 5 (algoritmo do feed).

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
                              Toast, Avatar, icons.tsx
context/AppContext.tsx     → estado global em memória (posts, mesas, conversas, toasts)
lib/mock-data.ts           → todos os dados fictícios
lib/types.ts               → tipos TypeScript compartilhados
```

## Próximas etapas

- **Etapa 3 — Autenticação:** Supabase Auth (sessão anônima → conta real),
  e aí sim trocar `lib/mock-data.ts` por chamadas reais ao banco.
- **Etapa 4 — Mensagens & notificações em tempo real:** Supabase Realtime.
- **Etapa 5 — Algoritmo do feed & Gemini:** ranking de posts, recomendação
  de mesas/pessoas, busca inteligente e resumo de discussões (Gemini sempre
  chamado pelo backend, nunca com API key no frontend).
- **Etapa 6 — Produção:** moderação real, políticas, deploy no Vercel,
  ajustes de PWA/mobile e lançamento.
