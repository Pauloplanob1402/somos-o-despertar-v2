-- =========================================================================
-- 0006_notificacoes.sql
-- Notificações por usuário. Inseridas via gatilho (ver 0007), nunca
-- diretamente pelo cliente.
-- =========================================================================

create table public.notificacoes (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  tipo        text not null check (tipo in ('curtida', 'comentario', 'seguidor', 'convite_mesa', 'mensagem')),
  ator_id     uuid references public.perfis(id) on delete set null,
  post_id     uuid references public.posts(id) on delete cascade,
  mesa_id     uuid references public.mesas(id) on delete cascade,
  lida        boolean not null default false,
  criado_em   timestamptz not null default now()
);

alter table public.notificacoes enable row level security;

create policy "Usuário só vê as próprias notificações"
  on public.notificacoes for select
  using (auth.uid() = usuario_id);

create policy "Usuário marca as próprias notificações como lidas"
  on public.notificacoes for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- Sem policy de insert: notificações só são criadas pelos gatilhos em
-- 0007 (rodam como o dono das funções, ignorando RLS) ou futuramente
-- por uma Edge Function com a service role key.
