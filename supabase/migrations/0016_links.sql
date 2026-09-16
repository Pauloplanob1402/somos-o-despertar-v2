-- =========================================================================
-- 0016_links.sql
-- Posts podem carregar um link com pré-visualização (título, descrição,
-- imagem, domínio) — os dados são buscados e gravados NA HORA DE
-- PUBLICAR (pela rota app/api/link-preview), não toda vez que o post é
-- exibido. Duas vantagens: não faz a mesma pessoa esperar o link carregar
-- de novo cada vez que abre o feed, e o preview fica estável mesmo se o
-- site de origem mudar o conteúdo depois.
-- =========================================================================

alter table public.posts
  add column link_url text,
  add column link_titulo text,
  add column link_descricao text,
  add column link_imagem text,
  add column link_dominio text;

-- ---------------------------------------------------------------------
-- criar_post ganha os campos do link. Muda a assinatura (mais
-- parâmetros) → apaga a versão antiga antes de recriar.
-- ---------------------------------------------------------------------
drop function if exists public.criar_post(text, text, text[], uuid, text);

create function public.criar_post(
  p_texto text default null,
  p_pergunta text default null,
  p_opcoes text[] default null,
  p_mesa_id uuid default null,
  p_imagem_url text default null,
  p_link_url text default null,
  p_link_titulo text default null,
  p_link_descricao text default null,
  p_link_imagem text default null,
  p_link_dominio text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_id uuid;
  i integer;
  ultimo_post timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão ativa.';
  end if;

  select max(criado_em) into ultimo_post from public.posts where autor_id = auth.uid();
  if ultimo_post is not null and now() - ultimo_post < interval '15 seconds' then
    raise exception 'Espere alguns segundos antes de publicar de novo.';
  end if;

  if p_pergunta is not null and char_length(trim(p_pergunta)) > 0 then
    if p_opcoes is null or array_length(p_opcoes, 1) < 2 then
      raise exception 'Uma enquete precisa de pelo menos 2 opções.';
    end if;

    insert into public.posts (autor_id, mesa_id, tipo, pergunta, imagem_url)
    values (auth.uid(), p_mesa_id, 'enquete', trim(p_pergunta), p_imagem_url)
    returning id into novo_id;

    for i in 1 .. array_length(p_opcoes, 1) loop
      insert into public.enquete_opcoes (post_id, texto, ordem)
      values (novo_id, trim(p_opcoes[i]), i - 1);
    end loop;
  else
    if p_texto is null or char_length(trim(p_texto)) = 0 then
      raise exception 'O post precisa de texto ou de uma pergunta.';
    end if;

    insert into public.posts (
      autor_id, mesa_id, tipo, texto, imagem_url,
      link_url, link_titulo, link_descricao, link_imagem, link_dominio
    )
    values (
      auth.uid(), p_mesa_id, 'texto', trim(p_texto), p_imagem_url,
      p_link_url, p_link_titulo, p_link_descricao, p_link_imagem, p_link_dominio
    )
    returning id into novo_id;
  end if;

  return novo_id;
end;
$$;

grant execute on function public.criar_post(
  text, text, text[], uuid, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------
-- As três funções de listagem de posts precisam devolver os campos de
-- link também. Mesma história: coluna nova no retorno → drop + create.
-- ---------------------------------------------------------------------
drop function if exists public.listar_feed(integer, integer);
drop function if exists public.listar_posts_do_perfil(uuid, integer);
drop function if exists public.listar_posts_da_mesa(uuid, integer);

create function public.listar_feed(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  curtidas_count integer, comentarios_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean,
  criado_em timestamptz, pontuacao double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.curtidas_count, p.comentarios_count,
    (curti.post_id is not null),
    voto.opcao_id,
    (salvo.post_id is not null),
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
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.seguidores sigo on sigo.seguido_id = p.autor_id and sigo.seguidor_id = auth.uid()
  left join public.mesa_membros minha_mesa on minha_mesa.mesa_id = p.mesa_id and minha_mesa.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  where not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    and not exists (
      select 1 from public.posts_ocultos po
      where po.post_id = p.id and po.usuario_id = auth.uid()
    )
  order by pontuacao desc, p.criado_em desc
  limit least(limite, 50)
  offset deslocamento;
$$;

create function public.listar_posts_do_perfil(id_perfil uuid, limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  curtidas_count integer, comentarios_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.curtidas_count, p.comentarios_count,
    (curti.post_id is not null), voto.opcao_id, (salvo.post_id is not null), p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  where p.autor_id = id_perfil
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
  order by p.criado_em desc
  limit least(limite, 50);
$$;

create function public.listar_posts_da_mesa(id_mesa uuid, limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  curtidas_count integer, comentarios_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.curtidas_count, p.comentarios_count,
    (curti.post_id is not null), voto.opcao_id, (salvo.post_id is not null), p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  where p.mesa_id = id_mesa
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
  order by p.criado_em desc
  limit least(limite, 50);
$$;

-- listar_meus_salvos também ganha os campos de link.
drop function if exists public.listar_meus_salvos(integer);

create function public.listar_meus_salvos(limite integer default 30)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  curtidas_count integer, comentarios_count integer,
  eu_curti boolean, minha_opcao_id uuid,
  criado_em timestamptz, salvo_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.curtidas_count, p.comentarios_count,
    (curti.post_id is not null),
    voto.opcao_id,
    p.criado_em,
    s.criado_em as salvo_em
  from public.salvos s
  join public.posts p on p.id = s.post_id
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  where s.usuario_id = auth.uid()
  order by s.criado_em desc
  limit least(limite, 100);
$$;

grant execute on function public.listar_feed(integer, integer) to authenticated;
grant execute on function public.listar_posts_do_perfil(uuid, integer) to authenticated;
grant execute on function public.listar_posts_da_mesa(uuid, integer) to authenticated;
grant execute on function public.listar_meus_salvos(integer) to authenticated;
