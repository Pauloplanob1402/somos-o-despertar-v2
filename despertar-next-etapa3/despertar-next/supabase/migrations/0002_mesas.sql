-- =========================================================================
-- 0002_mesas.sql
-- Mesas (comunidades temáticas) e a relação de quem participa de cada uma
-- =========================================================================

create table public.mesas (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  emoji           text not null default '🕊️',
  descricao       text not null default '',
  categoria       text not null,
  cor             text not null default '#B8663F',
  membros_count   integer not null default 0,
  criado_em       timestamptz not null default now(),

  constraint nome_mesa_unico unique (nome)
);

comment on table public.mesas is 'Mesas = comunidades temáticas (ex.: Despertar Diário, Silêncio & Presença).';

create table public.mesa_membros (
  mesa_id     uuid not null references public.mesas(id) on delete cascade,
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  entrou_em   timestamptz not null default now(),

  primary key (mesa_id, usuario_id)
);

alter table public.mesas enable row level security;
alter table public.mesa_membros enable row level security;

create policy "Mesas são visíveis a todos"
  on public.mesas for select
  using (true);

create policy "Participação em mesas é visível a todos"
  on public.mesa_membros for select
  using (true);

create policy "Usuário entra numa mesa por conta própria"
  on public.mesa_membros for insert
  with check (auth.uid() = usuario_id);

create policy "Usuário sai de uma mesa por conta própria"
  on public.mesa_membros for delete
  using (auth.uid() = usuario_id);
