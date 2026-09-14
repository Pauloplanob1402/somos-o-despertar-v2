-- =========================================================================
-- 0001_perfis.sql
-- Perfis públicos de usuário, 1:1 com auth.users (gerenciado pelo Supabase Auth)
-- =========================================================================

create table public.perfis (
  id                  uuid primary key references auth.users(id) on delete cascade,
  nome                text not null,
  arroba              text not null unique,
  bio                 text not null default '',
  cor                 text not null default '#B8663F',
  avatar_url          text,
  seguidores_count    integer not null default 0,
  seguindo_count      integer not null default 0,
  publicacoes_count   integer not null default 0,
  criado_em           timestamptz not null default now(),

  constraint arroba_formato check (arroba ~ '^[a-z0-9_]{3,20}$'),
  constraint nome_nao_vazio check (char_length(trim(nome)) > 0)
);

comment on table public.perfis is 'Perfil público de cada usuário. Um por conta de auth.users.';

alter table public.perfis enable row level security;

create policy "Perfis são visíveis a todos"
  on public.perfis for select
  using (true);

create policy "Usuário cria o próprio perfil"
  on public.perfis for insert
  with check (auth.uid() = id);

create policy "Usuário edita o próprio perfil"
  on public.perfis for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- Cria automaticamente um perfil quando uma conta nova é criada no Auth.
-- O 'arroba' inicial vem do metadata passado no signUp (ou um fallback
-- gerado a partir do e-mail); o usuário pode trocar depois.
-- ---------------------------------------------------------------------
create or replace function public.lidar_com_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, arroba, cor)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Nova pessoa'),
    coalesce(
      new.raw_user_meta_data ->> 'arroba',
      'pessoa_' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data ->> 'cor', '#B8663F')
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.lidar_com_novo_usuario();
