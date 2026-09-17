-- =========================================================================
-- 0021_deus_respondeu.sql
-- Fecha o ciclo pedido → resposta. Quem fez um pedido de oração agora
-- pode marcar "Deus respondeu" direto no post: abre o composer já
-- carregado com o pedido original citado, e o testemunho nasce ligado
-- a ele dos dois lados — o pedido passa a mostrar "🙌 Respondido" e o
-- testemunho mostra o que foi pedido antes da resposta.
--
-- Dois campos novos em posts, um em cada ponta do vínculo:
--   pedido_original_id — no testemunho, aponta pro pedido que ele responde
--   testemunho_id       — no pedido, aponta pro testemunho que o respondeu
-- =========================================================================

alter table public.posts
  add column pedido_original_id uuid references public.posts(id) on delete set null,
  add column testemunho_id uuid references public.posts(id) on delete set null,
  add column respondido_em timestamptz;

create index posts_pedido_original_id_idx on public.posts (pedido_original_id);

-- ---------------------------------------------------------------------
-- criar_post ganha um 13º parâmetro. Como isso muda a assinatura (não
-- só o corpo), a versão de 12 parâmetros precisa ser derrubada antes —
-- CREATE OR REPLACE não troca o número de argumentos de uma função.
-- ---------------------------------------------------------------------
drop function if exists public.criar_post(
  text, text, text[], uuid, text, text, text, text, text, text, text, uuid
);

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
  p_link_dominio text default null,
  p_tipo text default 'texto',
  p_versiculo_id uuid default null,
  p_pedido_original_id uuid default null
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
  pedido record;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão ativa.';
  end if;

  select max(criado_em) into ultimo_post from public.posts where autor_id = auth.uid();
  if ultimo_post is not null and now() - ultimo_post < interval '15 seconds' then
    raise exception 'Espere alguns segundos antes de publicar de novo.';
  end if;

  -- "Deus respondeu" só faz sentido junto de um testemunho, e só o
  -- autor do pedido original pode fechar o próprio ciclo.
  if p_pedido_original_id is not null then
    if p_tipo <> 'testemunho' then
      raise exception 'Só um testemunho pode responder a um pedido.';
    end if;

    select id, autor_id, tipo, testemunho_id
    into pedido
    from public.posts
    where id = p_pedido_original_id
    for update;

    if pedido.id is null then
      raise exception 'Esse pedido de oração não existe mais.';
    end if;
    if pedido.autor_id <> auth.uid() then
      raise exception 'Só quem fez o pedido pode marcar que Deus respondeu.';
    end if;
    if pedido.tipo <> 'oracao' then
      raise exception 'Esse post não é um pedido de oração.';
    end if;
    if pedido.testemunho_id is not null then
      raise exception 'Esse pedido já tem um testemunho.';
    end if;
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
      versiculo_id, pedido_original_id
    )
    values (
      auth.uid(), p_mesa_id, p_tipo, trim(p_texto), p_imagem_url,
      p_link_url, p_link_titulo, p_link_descricao, p_link_imagem, p_link_dominio,
      p_versiculo_id, p_pedido_original_id
    )
    returning id into novo_id;

    if p_pedido_original_id is not null then
      update public.posts
      set testemunho_id = novo_id, respondido_em = now()
      where id = p_pedido_original_id;
    end if;
  end if;

  return novo_id;
end;
$$;

grant execute on function public.criar_post(
  text, text, text[], uuid, text, text, text, text, text, text, text, uuid, uuid
) to authenticated;

-- =====================================================================
-- As sete listagens de post ganham as três colunas novas + o texto do
-- pedido original (pra citar dentro do testemunho). Como o formato de
-- retorno muda, cada função precisa ser derrubada antes de recriada —
-- CREATE OR REPLACE não troca as colunas de saída.
-- =====================================================================

drop function if exists public.listar_feed(integer, integer);
drop function if exists public.listar_posts_do_perfil(uuid, integer);
drop function if exists public.listar_posts_da_mesa(uuid, integer);
drop function if exists public.listar_meus_salvos(integer);
drop function if exists public.listar_reflexoes_do_dia(integer);
drop function if exists public.listar_mural_oracao(boolean, integer, integer);
drop function if exists public.listar_mural_testemunhos(integer, integer);

create function public.listar_feed(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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
      -- pedido de oração recente sobe: é o post em que a resposta de
      -- alguém importa mais, e ele perde o valor se ninguém vir a tempo
      + (case
           when p.tipo = 'oracao' and now() - p.criado_em < interval '48 hours'
           then 2.5 else 0.0
         end)
      -- testemunho sobe também: é a prova de que orar aqui vale a pena
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

create function public.listar_posts_do_perfil(id_perfil uuid, limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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

create function public.listar_posts_da_mesa(id_mesa uuid, limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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

create function public.listar_meus_salvos(limite integer default 30)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  versiculo_id uuid, versiculo_referencia text,
  curtidas_count integer, comentarios_count integer, oracoes_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_orei boolean,
  testemunho_id uuid, respondido_em timestamptz,
  pedido_original_id uuid, pedido_original_texto text,
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
    p.versiculo_id, vers.referencia,
    p.curtidas_count, p.comentarios_count, p.oracoes_count,
    (curti.post_id is not null),
    voto.opcao_id,
    (orei.post_id is not null),
    p.testemunho_id, p.respondido_em,
    p.pedido_original_id, pedido_orig.texto,
    p.criado_em,
    s.criado_em as salvo_em
  from public.salvos s
  join public.posts p on p.id = s.post_id
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.posts pedido_orig on pedido_orig.id = p.pedido_original_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where s.usuario_id = auth.uid()
  order by s.criado_em desc
  limit least(limite, 100);
$$;

create function public.listar_reflexoes_do_dia(limite integer default 30)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
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
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as dia),
  do_dia as (select v.id from public.obter_versiculo_do_dia() v)
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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
  where p.versiculo_id = (select id from do_dia)
    and (p.criado_em at time zone 'America/Sao_Paulo')::date = (select dia from hoje)
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
  order by p.criado_em desc
  limit least(limite, 60);
$$;

create function public.listar_mural_oracao(
  p_somente_sem_resposta boolean default false,
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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
  where p.tipo = 'oracao'
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    and not exists (
      select 1 from public.posts_ocultos po
      where po.post_id = p.id and po.usuario_id = auth.uid()
    )
    and (not p_somente_sem_resposta or p.oracoes_count = 0)
  order by p.criado_em desc
  limit least(p_limite, 60)
  offset p_deslocamento;
$$;

create function public.listar_mural_testemunhos(
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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

grant execute on function public.listar_feed(integer, integer) to authenticated;
grant execute on function public.listar_posts_do_perfil(uuid, integer) to authenticated;
grant execute on function public.listar_posts_da_mesa(uuid, integer) to authenticated;
grant execute on function public.listar_meus_salvos(integer) to authenticated;
grant execute on function public.listar_reflexoes_do_dia(integer) to authenticated;
grant execute on function public.listar_mural_oracao(boolean, integer, integer) to authenticated;
grant execute on function public.listar_mural_testemunhos(integer, integer) to authenticated;
