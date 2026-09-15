-- =========================================================================
-- 0013_descoberta.sql
-- Mesas, pessoas e busca — tudo que alimenta as telas Descobrir, Mesas,
-- Pessoas e Busca, já sabendo se EU sigo/participo de cada item.
--
-- As recomendações aqui são determinísticas e explicáveis (contagem de
-- afinidade real, não "mágica"): mesa que amigos meus participam, pessoa
-- seguida por quem eu sigo. O Gemini entra por cima disso na camada de
-- API (app/api/), nunca substituindo essa base.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Todas as mesas, com "eu participo?" — telas Mesas e Descobrir.
-- ---------------------------------------------------------------------
create or replace function public.listar_mesas()
returns table (
  id uuid,
  nome text,
  emoji text,
  descricao text,
  categoria text,
  cor text,
  membros_count integer,
  eu_participo boolean,
  amigos_na_mesa bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id, m.nome, m.emoji, m.descricao, m.categoria, m.cor, m.membros_count,
    (eu.usuario_id is not null) as eu_participo,
    coalesce(amigos.total, 0) as amigos_na_mesa
  from public.mesas m
  left join public.mesa_membros eu
    on eu.mesa_id = m.id and eu.usuario_id = auth.uid()
  left join lateral (
    select count(*) as total
    from public.mesa_membros mm
    join public.seguidores s
      on s.seguido_id = mm.usuario_id and s.seguidor_id = auth.uid()
    where mm.mesa_id = m.id
  ) amigos on true
  order by m.membros_count desc;
$$;

grant execute on function public.listar_mesas() to authenticated;

-- ---------------------------------------------------------------------
-- Uma mesa específica (página da mesa).
-- ---------------------------------------------------------------------
create or replace function public.obter_mesa(id_mesa uuid)
returns table (
  id uuid,
  nome text,
  emoji text,
  descricao text,
  categoria text,
  cor text,
  membros_count integer,
  eu_participo boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id, m.nome, m.emoji, m.descricao, m.categoria, m.cor, m.membros_count,
    (eu.usuario_id is not null)
  from public.mesas m
  left join public.mesa_membros eu on eu.mesa_id = m.id and eu.usuario_id = auth.uid()
  where m.id = id_mesa;
$$;

grant execute on function public.obter_mesa(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Membros de uma mesa.
-- ---------------------------------------------------------------------
create or replace function public.listar_membros_da_mesa(id_mesa uuid, limite integer default 20)
returns table (
  id uuid,
  nome text,
  arroba text,
  bio text,
  cor text,
  eu_sigo boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.nome, p.arroba, p.bio, p.cor,
    (s.seguido_id is not null)
  from public.mesa_membros mm
  join public.perfis p on p.id = mm.usuario_id
  left join public.seguidores s on s.seguido_id = p.id and s.seguidor_id = auth.uid()
  where mm.mesa_id = id_mesa
  order by mm.entrou_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_membros_da_mesa(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Pessoas pra seguir. Ordena por afinidade real: primeiro quem é seguido
-- por gente que eu já sigo ("amigos em comum"), depois quem tem mais
-- seguidores. Nunca devolve a mim mesmo nem quem eu já sigo.
-- ---------------------------------------------------------------------
create or replace function public.listar_pessoas_sugeridas(limite integer default 20)
returns table (
  id uuid,
  nome text,
  arroba text,
  bio text,
  cor text,
  seguidores_count integer,
  amigos_em_comum bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.nome, p.arroba, p.bio, p.cor, p.seguidores_count,
    coalesce(comum.total, 0) as amigos_em_comum
  from public.perfis p
  left join lateral (
    select count(*) as total
    from public.seguidores s1
    join public.seguidores s2
      on s2.seguidor_id = s1.seguido_id and s2.seguido_id = p.id
    where s1.seguidor_id = auth.uid()
  ) comum on true
  where p.id <> auth.uid()
    and not exists (
      select 1 from public.seguidores
      where seguidor_id = auth.uid() and seguido_id = p.id
    )
  order by comum.total desc nulls last, p.seguidores_count desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_pessoas_sugeridas(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Busca: pessoas, mesas e posts numa chamada só.
-- ---------------------------------------------------------------------
create or replace function public.buscar(termo text)
returns table (
  tipo_resultado text,
  id uuid,
  titulo text,
  subtitulo text,
  detalhe text,
  cor text,
  emoji text
)
language sql
security definer
set search_path = public
stable
as $$
  (
    select
      'pessoa' as tipo_resultado,
      p.id, p.nome as titulo, '@' || p.arroba as subtitulo, p.bio as detalhe,
      p.cor, null::text as emoji
    from public.perfis p
    where p.nome ilike '%' || termo || '%' or p.arroba ilike '%' || termo || '%'
    limit 10
  )
  union all
  (
    select
      'mesa', m.id, m.nome, m.membros_count || ' membros', m.descricao, m.cor, m.emoji
    from public.mesas m
    where m.nome ilike '%' || termo || '%'
       or m.categoria ilike '%' || termo || '%'
       or m.descricao ilike '%' || termo || '%'
    limit 10
  )
  union all
  (
    select
      'post', p.id, autor.nome, '@' || autor.arroba,
      coalesce(p.texto, p.pergunta), autor.cor, null::text
    from public.posts p
    join public.perfis autor on autor.id = p.autor_id
    where p.texto ilike '%' || termo || '%' or p.pergunta ilike '%' || termo || '%'
    order by p.criado_em desc
    limit 10
  );
$$;

grant execute on function public.buscar(text) to authenticated;

-- ---------------------------------------------------------------------
-- "Em alta": categorias de mesa com mais posts nos últimos 7 dias.
-- Alimenta o bloco lateral que antes era uma lista fixa no código.
-- ---------------------------------------------------------------------
create or replace function public.listar_em_alta(limite integer default 5)
returns table (
  categoria text,
  posts_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select m.categoria, count(p.id) as posts_count
  from public.posts p
  join public.mesas m on m.id = p.mesa_id
  where p.criado_em > now() - interval '7 days'
  group by m.categoria
  order by posts_count desc
  limit least(limite, 20);
$$;

grant execute on function public.listar_em_alta(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Comentários de um post.
-- ---------------------------------------------------------------------
create or replace function public.listar_comentarios(id_post uuid, limite integer default 50)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
  texto text,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.autor_id, a.nome, a.arroba, a.cor, c.texto, c.criado_em
  from public.comentarios c
  join public.perfis a on a.id = c.autor_id
  where c.post_id = id_post
  order by c.criado_em asc
  limit least(limite, 200);
$$;

grant execute on function public.listar_comentarios(uuid, integer) to authenticated;

-- índice que o ranking do feed e o "em alta" usam
create index if not exists posts_mesa_criado_em_idx
  on public.posts (mesa_id, criado_em desc)
  where mesa_id is not null;
