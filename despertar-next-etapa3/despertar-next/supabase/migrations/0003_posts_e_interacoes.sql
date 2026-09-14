-- =========================================================================
-- 0003_posts_e_interacoes.sql
-- Posts (texto ou enquete), opções/votos de enquete, curtidas e comentários
-- =========================================================================

create table public.posts (
  id                  uuid primary key default gen_random_uuid(),
  autor_id            uuid not null references public.perfis(id) on delete cascade,
  mesa_id             uuid references public.mesas(id) on delete set null,
  tipo                text not null default 'texto' check (tipo in ('texto', 'enquete')),
  texto               text,
  pergunta            text,
  imagem_url          text,
  curtidas_count      integer not null default 0,
  comentarios_count   integer not null default 0,
  criado_em           timestamptz not null default now(),

  constraint conteudo_obrigatorio check (
    (tipo = 'texto' and texto is not null and char_length(trim(texto)) > 0)
    or
    (tipo = 'enquete' and pergunta is not null and char_length(trim(pergunta)) > 0)
  )
);

comment on table public.posts is 'Publicações do feed. mesa_id é opcional (post pode ser só do perfil, sem mesa).';

create table public.enquete_opcoes (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references public.posts(id) on delete cascade,
  texto     text not null,
  ordem     smallint not null default 0
);

create table public.enquete_votos (
  post_id     uuid not null references public.posts(id) on delete cascade,
  opcao_id    uuid not null references public.enquete_opcoes(id) on delete cascade,
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  criado_em   timestamptz not null default now(),

  primary key (post_id, usuario_id) -- um voto por pessoa, por enquete
);

create table public.curtidas (
  post_id     uuid not null references public.posts(id) on delete cascade,
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  criado_em   timestamptz not null default now(),

  primary key (post_id, usuario_id)
);

create table public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  autor_id    uuid not null references public.perfis(id) on delete cascade,
  texto       text not null check (char_length(trim(texto)) > 0),
  criado_em   timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.enquete_opcoes enable row level security;
alter table public.enquete_votos enable row level security;
alter table public.curtidas enable row level security;
alter table public.comentarios enable row level security;

-- posts ------------------------------------------------------------------
create policy "Posts são visíveis a todos"
  on public.posts for select
  using (true);

create policy "Usuário publica em seu próprio nome"
  on public.posts for insert
  with check (auth.uid() = autor_id);

create policy "Usuário apaga o próprio post"
  on public.posts for delete
  using (auth.uid() = autor_id);

-- opções de enquete --------------------------------------------------------
create policy "Opções de enquete são visíveis a todos"
  on public.enquete_opcoes for select
  using (true);

create policy "Só o autor do post cria as opções da enquete"
  on public.enquete_opcoes for insert
  with check (
    exists (
      select 1 from public.posts
      where posts.id = post_id and posts.autor_id = auth.uid()
    )
  );

-- votos de enquete -----------------------------------------------------
create policy "Contagem de votos é visível a todos"
  on public.enquete_votos for select
  using (true);

create policy "Usuário vota em seu próprio nome"
  on public.enquete_votos for insert
  with check (auth.uid() = usuario_id);

-- curtidas -----------------------------------------------------------------
create policy "Curtidas são visíveis a todos"
  on public.curtidas for select
  using (true);

create policy "Usuário curte em seu próprio nome"
  on public.curtidas for insert
  with check (auth.uid() = usuario_id);

create policy "Usuário remove a própria curtida"
  on public.curtidas for delete
  using (auth.uid() = usuario_id);

-- comentários --------------------------------------------------------------
create policy "Comentários são visíveis a todos"
  on public.comentarios for select
  using (true);

create policy "Usuário comenta em seu próprio nome"
  on public.comentarios for insert
  with check (auth.uid() = autor_id);

create policy "Usuário apaga o próprio comentário"
  on public.comentarios for delete
  using (auth.uid() = autor_id);
