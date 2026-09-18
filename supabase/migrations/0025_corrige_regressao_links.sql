-- =========================================================================
-- 0025_corrige_regressao_links.sql
--
-- CORREÇÃO DE UM ERRO MEU: a migration 0024_avatares.sql recriou
-- listar_feed, listar_posts_do_perfil e listar_posts_da_mesa olhando só
-- pra versão ORIGINAL dessas funções (0012_feed.sql), sem perceber que
-- elas já tinham sido estendidas depois, em 0016 (link_url/titulo/
-- descricao/imagem/dominio), 0018 (versiculo_id/referencia,
-- oracoes_count, eu_orei) e 0021 (eu_salvei, testemunho_id/respondido_em,
-- pedido_original_id/texto). O resultado: 0024 apagou essas colunas todas
-- sem querer — por isso os links (inclusive a miniatura do YouTube),
-- contagem de orações, posts salvos e o vínculo pedido↔testemunho pararam
-- de aparecer depois dela.
--
-- Essa migration recria as três funções a partir da última versão
-- correta (0021_deus_respondeu.sql), com TODAS as colunas de volta, mais
-- autor_avatar_url. listar_comentarios, listar_quem_orou e
-- listar_minhas_conversas não foram afetadas (só tinham uma definição
-- anterior mesmo) e continuam como estavam.
-- =========================================================================

drop function if exists public.listar_feed(integer, integer);
create function public.listar_feed(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text, autor_avatar_url text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  versiculo_id uuid, versiculo_referencia text,
  curtidas_count integer, comentarios_count integer, oracoes_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, eu_orei boolean,
  testemunho_id uuid, respondido_em timestamptz,
  pedido_original_id uuid, pedido_original_texto text,
  criado_em timestamptz, pontuacao double precision
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
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.versiculo_id, vers.referencia,
    p.curtidas_count, p.comentarios_count, p.oracoes_count,
    (curti.post_id is not null),
    voto.opcao_id,
    (salvo.post_id is not null),
    (orei.post_id is not null),
    p.testemunho_id, p.respondido_em,
    p.pedido_original_id, pedido_orig.texto,
    p.criado_em,
    (
      (case when sigo.seguido_id is not null then 3.0 else 0.0 end)
      + (case when minha_mesa.mesa_id is not null then 2.0 else 0.0 end)
      + (case
           when p.tipo = 'oracao' and now() - p.criado_em < interval '48 hours'
           then 2.5 else 0.0
         end)
      + (case when p.tipo = 'testemunho' then 2.0 else 0.0 end)
      + ln(1 + p.curtidas_count + 2 * p.comentarios_count + 2 * p.oracoes_count)
      + 5.0 * exp(-extract(epoch from (now() - p.criado_em)) / 43200.0)
    ) as pontuacao
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.posts pedido_orig on pedido_orig.id = p.pedido_original_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.seguidores sigo on sigo.seguido_id = p.autor_id and sigo.seguidor_id = auth.uid()
  left join public.mesa_membros minha_mesa on minha_mesa.mesa_id = p.mesa_id and minha_mesa.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    and not exists (
      select 1 from public.posts_ocultos po
      where po.post_id = p.id and po.usuario_id = auth.uid()
    )
  order by pontuacao desc, p.criado_em desc
  limit least(limite, 50)
  offset deslocamento;
$$;

grant execute on function public.listar_feed(integer, integer) to authenticated;

drop function if exists public.listar_posts_do_perfil(uuid, integer);
create function public.listar_posts_do_perfil(id_perfil uuid, limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text, autor_avatar_url text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  versiculo_id uuid, versiculo_referencia text,
  curtidas_count integer, comentarios_count integer, oracoes_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, eu_orei boolean,
  testemunho_id uuid, respondido_em timestamptz,
  pedido_original_id uuid, pedido_original_texto text,
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
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.versiculo_id, vers.referencia,
    p.curtidas_count, p.comentarios_count, p.oracoes_count,
    (curti.post_id is not null), voto.opcao_id, (salvo.post_id is not null), (orei.post_id is not null),
    p.testemunho_id, p.respondido_em,
    p.pedido_original_id, pedido_orig.texto,
    p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.posts pedido_orig on pedido_orig.id = p.pedido_original_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where p.autor_id = id_perfil
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
  order by p.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_posts_do_perfil(uuid, integer) to authenticated;

drop function if exists public.listar_posts_da_mesa(uuid, integer);
create function public.listar_posts_da_mesa(id_mesa uuid, limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text, autor_avatar_url text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  versiculo_id uuid, versiculo_referencia text,
  curtidas_count integer, comentarios_count integer, oracoes_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, eu_orei boolean,
  testemunho_id uuid, respondido_em timestamptz,
  pedido_original_id uuid, pedido_original_texto text,
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
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.versiculo_id, vers.referencia,
    p.curtidas_count, p.comentarios_count, p.oracoes_count,
    (curti.post_id is not null), voto.opcao_id, (salvo.post_id is not null), (orei.post_id is not null),
    p.testemunho_id, p.respondido_em,
    p.pedido_original_id, pedido_orig.texto,
    p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.posts pedido_orig on pedido_orig.id = p.pedido_original_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where p.mesa_id = id_mesa
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
  order by p.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_posts_da_mesa(uuid, integer) to authenticated;
