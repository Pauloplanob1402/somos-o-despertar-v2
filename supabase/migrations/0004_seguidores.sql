-- =========================================================================
-- 0004_seguidores.sql
-- Relação de "seguir" entre perfis
-- =========================================================================

create table public.seguidores (
  seguidor_id   uuid not null references public.perfis(id) on delete cascade,
  seguido_id    uuid not null references public.perfis(id) on delete cascade,
  criado_em     timestamptz not null default now(),

  primary key (seguidor_id, seguido_id),
  constraint nao_seguir_a_si_mesmo check (seguidor_id <> seguido_id)
);

alter table public.seguidores enable row level security;

create policy "Relação de seguir é visível a todos"
  on public.seguidores for select
  using (true);

create policy "Usuário decide quem segue"
  on public.seguidores for insert
  with check (auth.uid() = seguidor_id);

create policy "Usuário decide deixar de seguir"
  on public.seguidores for delete
  using (auth.uid() = seguidor_id);
