-- =========================================================================
-- 0024_avatares.sql
-- Propaga avatar_url pelas funções mais visíveis (feed, comentários, lista
-- de conversas, "quem orou"). Como muda as colunas de retorno, precisa
-- dropar antes de recriar (create or replace não permite mudar o formato
-- de saída de uma função existente).
--
-- Obs.: isso NÃO cobre 100% do app ainda — reflexões do dia, testemunhos,
-- "Deus respondeu", sugestões de pessoas e a lista de seguidores ainda
-- não devolvem avatar_url, então continuam mostrando o círculo colorido
-- por enquanto. Dá pra estender do mesmo jeito depois.
-- =========================================================================

-- Feed principal --------------------------------------------------------
drop function if exists public.listar_feed(integer, integer);
create function public.listar_feed(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
  autor_avatar_url text,
  mesa_id uuid,
  mesa_nome text,
  mesa_emoji text,
  tipo text,
  texto text,
  pergunta text,
  imagem_url text,
  curtidas_count integer,
  comentarios_count integer,
  eu_curti boolean,
  minha_opcao_id uuid,
  criado_em timestamptz,
  pontuacao double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.autor_id,
    autor.nome as autor_nome,
    autor.arroba as autor_arroba,
    autor.cor as autor_cor,
    autor.avatar_url as autor_avatar_url,
    p.mesa_id,
    mesa.nome as mesa_nome,
    mesa.emoji as mesa_emoji,
    p.tipo,
    p.texto,
    p.pergunta,
    p.imagem_url,
    p.curtidas_count,
    p.comentarios_count,
    (curti.post_id is not null) as eu_curti,
    voto.opcao_id as minha_opcao_id,
    p.criado_em,
    (
      (case when sigo.seguido_id is not null then 3.0 else 0.0 end)
      + (case when minha_mesa.mesa_id is not null then 2.0 else 0.0 end)
      + ln(1 + p.curtidas_count + 2 * p.comentarios_count)
      + 5.0 * exp(-extract(epoch from (now() - p.criado_em)) / 43200.0)
    ) as pontuacao
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.curtidas curti
    on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto
    on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.seguidores sigo
    on sigo.seguido_id = p.autor_id and sigo.seguidor_id = auth.uid()
  left join public.mesa_membros minha_mesa
    on minha_mesa.mesa_id = p.mesa_id and minha_mesa.usuario_id = auth.uid()
  order by pontuacao desc, p.criado_em desc
  limit least(limite, 50)
  offset deslocamento;
$$;

grant execute on function public.listar_feed(integer, integer) to authenticated;

-- Posts de um perfil ------------------------------------------------------
drop function if exists public.listar_posts_do_perfil(uuid, integer);
create function public.listar_posts_do_perfil(
  id_perfil uuid,
  limite integer default 20
)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
  autor_avatar_url text,
  mesa_id uuid,
  mesa_nome text,
  mesa_emoji text,
  tipo text,
  texto text,
  pergunta text,
  imagem_url text,
  curtidas_count integer,
  comentarios_count integer,
  eu_curti boolean,
  minha_opcao_id uuid,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor, autor.avatar_url,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.curtidas_count, p.comentarios_count,
    (curti.post_id is not null),
    voto.opcao_id,
    p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  where p.autor_id = id_perfil
  order by p.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_posts_do_perfil(uuid, integer) to authenticated;

-- Posts de uma mesa ---------------------------------------------------------
drop function if exists public.listar_posts_da_mesa(uuid, integer);
create function public.listar_posts_da_mesa(
  id_mesa uuid,
  limite integer default 20
)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
  autor_avatar_url text,
  mesa_id uuid,
  mesa_nome text,
  mesa_emoji text,
  tipo text,
  texto text,
  pergunta text,
  imagem_url text,
  curtidas_count integer,
  comentarios_count integer,
  eu_curti boolean,
  minha_opcao_id uuid,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor, autor.avatar_url,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.curtidas_count, p.comentarios_count,
    (curti.post_id is not null),
    voto.opcao_id,
    p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  where p.mesa_id = id_mesa
  order by p.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_posts_da_mesa(uuid, integer) to authenticated;

-- Comentários ---------------------------------------------------------------
drop function if exists public.listar_comentarios(uuid, integer);
create function public.listar_comentarios(id_post uuid, limite integer default 50)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
  autor_avatar_url text,
  texto text,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.autor_id, a.nome, a.arroba, a.cor, a.avatar_url, c.texto, c.criado_em
  from public.comentarios c
  join public.perfis a on a.id = c.autor_id
  where c.post_id = id_post
  order by c.criado_em asc
  limit least(limite, 200);
$$;

grant execute on function public.listar_comentarios(uuid, integer) to authenticated;

-- Quem orou por um pedido -----------------------------------------------
drop function if exists public.listar_quem_orou(uuid, integer);
create function public.listar_quem_orou(id_post uuid, limite integer default 12)
returns table (id uuid, nome text, arroba text, cor text, avatar_url text, criado_em timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome, p.arroba, p.cor, p.avatar_url, o.criado_em
  from public.oracoes o
  join public.perfis p on p.id = o.usuario_id
  where o.post_id = id_post
    and not public.ha_bloqueio_entre(auth.uid(), p.id)
  order by o.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_quem_orou(uuid, integer) to authenticated;

-- Lista de conversas ---------------------------------------------------------
drop function if exists public.listar_minhas_conversas();
create function public.listar_minhas_conversas()
returns table (
  conversa_id uuid,
  tipo text,
  nome text,
  emoji text,
  outro_id uuid,
  outro_nome text,
  outro_arroba text,
  outro_cor text,
  outro_avatar_url text,
  ultima_mensagem text,
  ultima_mensagem_em timestamptz,
  ultima_mensagem_autor_id uuid,
  nao_lidas bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id as conversa_id,
    c.tipo,
    c.nome,
    c.emoji,
    outro.usuario_id as outro_id,
    outro_perfil.nome as outro_nome,
    outro_perfil.arroba as outro_arroba,
    outro_perfil.cor as outro_cor,
    outro_perfil.avatar_url as outro_avatar_url,
    ultima.texto as ultima_mensagem,
    ultima.criado_em as ultima_mensagem_em,
    ultima.autor_id as ultima_mensagem_autor_id,
    coalesce(nao_lidas.total, 0) as nao_lidas
  from public.conversas c
  join public.conversa_participantes eu
    on eu.conversa_id = c.id and eu.usuario_id = auth.uid()
  left join lateral (
    select cp.usuario_id
    from public.conversa_participantes cp
    where cp.conversa_id = c.id and cp.usuario_id <> auth.uid()
    limit 1
  ) outro on c.tipo = 'pessoa'
  left join public.perfis outro_perfil on outro_perfil.id = outro.usuario_id
  left join lateral (
    select m.texto, m.criado_em, m.autor_id
    from public.mensagens m
    where m.conversa_id = c.id
    order by m.criado_em desc
    limit 1
  ) ultima on true
  left join lateral (
    select count(*) as total
    from public.mensagens m2
    where m2.conversa_id = c.id
      and m2.autor_id <> auth.uid()
      and m2.criado_em > eu.lido_ate
  ) nao_lidas on true
  order by coalesce(ultima.criado_em, c.criado_em) desc;
$$;

grant execute on function public.listar_minhas_conversas() to authenticated;
