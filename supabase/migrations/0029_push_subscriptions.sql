-- =========================================================================
-- 0029_push_subscriptions.sql
-- Guarda as "inscrições" de push do navegador de cada pessoa (endpoint +
-- chaves públicas do PushManager). O envio em si acontece no servidor
-- Next.js (app/api/push/send), usando a service_role key pra poder ler a
-- inscrição de QUALQUER usuário (ex: alguém comentou no seu post — o
-- servidor precisa achar SUA inscrição, não a de quem comentou).
-- =========================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  criado_em   timestamptz not null default now()
);

create index if not exists push_subscriptions_usuario_id_idx on public.push_subscriptions (usuario_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Cada um só vê as próprias inscrições" on public.push_subscriptions;
create policy "Cada um só vê as próprias inscrições"
  on public.push_subscriptions for select
  using (auth.uid() = usuario_id);

drop policy if exists "Cada um só cria inscrição pra si mesmo" on public.push_subscriptions;
create policy "Cada um só cria inscrição pra si mesmo"
  on public.push_subscriptions for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "Cada um só apaga a própria inscrição" on public.push_subscriptions;
create policy "Cada um só apaga a própria inscrição"
  on public.push_subscriptions for delete
  using (auth.uid() = usuario_id);
