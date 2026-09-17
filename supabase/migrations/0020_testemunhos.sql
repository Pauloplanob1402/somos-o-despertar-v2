-- =========================================================================
-- 0020_testemunhos.sql
-- Todo pedido de oração pede uma continuação: "Deus respondeu". Sem um
-- lugar pra isso, a resposta se perde num comentário qualquer. Agora
-- testemunho é um quarto tipo de post — igual a pedido de oração, mas
-- do lado oposto do ciclo — e o Mural de Oração ganha uma aba própria
-- pra eles, porque prova de que orações são respondidas é o que faz
-- alguém voltar a pedir e a orar.
-- =========================================================================

alter table public.posts drop constraint if exists posts_tipo_check;
alter table public.posts drop constraint if exists conteudo_obrigatorio;

alter table public.posts
  add constraint posts_tipo_check check (tipo in ('texto', 'enquete', 'oracao', 'testemunho'));

alter table public.posts
  add constraint conteudo_obrigatorio check (
    (tipo in ('texto', 'oracao', 'testemunho') and texto is not null and char_length(trim(texto)) > 0)
    or
    (tipo = 'enquete' and pergunta is not null and char_length(trim(pergunta)) > 0)
  );

-- criar_post: mesma assinatura de 0018, só a validação de tipo cresce.
create or replace function public.criar_post(
  p_texto text default null,
  p_pergunta text default null,
  p_opcoes text[] default null,
  p_mesa_id uuid default null,
  p_imagem_url text default null,
  p_link_url text default null,
  p_link_titulo text default null,
  p_link_descricao text default null,
  p_link_imagem text default null,
  p_link_dominio text default null,
  p_tipo text default 'texto',
  p_versiculo_id uuid default null
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

    if p_tipo not in ('texto', 'oracao', 'testemunho') then
      raise exception 'Tipo de publicação inválido.';
    end if;

    insert into public.posts (
      autor_id, mesa_id, tipo, texto, imagem_url,
      link_url, link_titulo, link_descricao, link_imagem, link_dominio,
      versiculo_id
    )
    values (
      auth.uid(), p_mesa_id, p_tipo, trim(p_texto), p_imagem_url,
      p_link_url, p_link_titulo, p_link_descricao, p_link_imagem, p_link_dominio,
      p_versiculo_id
    )
    returning id into novo_id;
  end if;

  return novo_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Aba "Testemunhos" do mural — mesmo formato de listar_mural_oracao,
-- pra reaproveitar o mapeador e o PostCard sem adaptação nenhuma.
-- ---------------------------------------------------------------------
create or replace function public.listar_mural_testemunhos(
  p_limite integer default 40,
  p_deslocamento integer default 0
)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  versiculo_id uuid, versiculo_referencia text,
  curtidas_count integer, comentarios_count integer, oracoes_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, eu_orei boolean,
  criado_em timestamptz
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
    p.versiculo_id, vers.referencia,
    p.curtidas_count, p.comentarios_count, p.oracoes_count,
    (curti.post_id is not null), voto.opcao_id, (salvo.post_id is not null), (orei.post_id is not null),
    p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where p.tipo = 'testemunho'
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    and not exists (
      select 1 from public.posts_ocultos po
      where po.post_id = p.id and po.usuario_id = auth.uid()
    )
  order by p.criado_em desc
  limit least(p_limite, 60)
  offset p_deslocamento;
$$;

grant execute on function public.listar_mural_testemunhos(integer, integer) to authenticated;

create or replace function public.contar_testemunhos_semana()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)
  from public.posts p
  where p.tipo = 'testemunho'
    and p.criado_em > now() - interval '7 days'
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id);
$$;

grant execute on function public.contar_testemunhos_semana() to authenticated;
