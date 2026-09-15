-- =========================================================================
-- 0012_feed.sql
-- O feed de verdade. Em vez de o frontend puxar posts crus e montar tudo
-- no cliente (o que daria N+1 queries por causa de autor, curtidas, se
-- EU já curti, opções de enquete etc.), uma função só devolve a página
-- do feed pronta.
--
-- O ranking é uma pontuação simples e explicável, no espírito do
-- lib/algorithm.ts do UNSAY — nada de caixa-preta:
--
--   pontuacao = afinidade + engajamento + novidade
--
--   afinidade   → +3 se sigo o autor; +2 se o post é de uma mesa que
--                 participo. Quem eu escolhi acompanhar vem primeiro.
--   engajamento → ln(1 + curtidas + 2*comentários). Log pra um post com
--                 500 curtidas não esmagar todo o resto do feed pra
--                 sempre; comentário pesa o dobro de curtida porque dá
--                 mais trabalho e indica conversa de verdade.
--   novidade    → decai com a idade do post (meia-vida de ~12h), pra o
--                 feed não congelar nos mesmos campeões de sempre.
--
-- Os pesos ficam todos aqui, num lugar só, fáceis de ajustar depois com
-- dados reais de uso.
-- =========================================================================

create or replace function public.listar_feed(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
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
      -- afinidade
      (case when sigo.seguido_id is not null then 3.0 else 0.0 end)
      + (case when minha_mesa.mesa_id is not null then 2.0 else 0.0 end)
      -- engajamento (log pra achatar números muito grandes)
      + ln(1 + p.curtidas_count + 2 * p.comentarios_count)
      -- novidade: decaimento exponencial, meia-vida de 12 horas
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

-- ---------------------------------------------------------------------
-- Posts de um perfil específico (aba "Publicações" do perfil).
-- ---------------------------------------------------------------------
create or replace function public.listar_posts_do_perfil(
  id_perfil uuid,
  limite integer default 20
)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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

-- ---------------------------------------------------------------------
-- Posts de uma mesa específica.
-- ---------------------------------------------------------------------
create or replace function public.listar_posts_da_mesa(
  id_mesa uuid,
  limite integer default 20
)
returns table (
  id uuid,
  autor_id uuid,
  autor_nome text,
  autor_arroba text,
  autor_cor text,
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
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor,
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

-- ---------------------------------------------------------------------
-- Opções de uma enquete, já com a contagem de votos de cada uma e a
-- porcentagem. Chamado pro conjunto de posts de enquete que aparecem
-- na página atual do feed.
-- ---------------------------------------------------------------------
create or replace function public.listar_opcoes_enquete(ids_posts uuid[])
returns table (
  post_id uuid,
  opcao_id uuid,
  texto text,
  ordem smallint,
  votos bigint,
  pct numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with contagem as (
    select
      o.post_id,
      o.id as opcao_id,
      o.texto,
      o.ordem,
      count(v.usuario_id) as votos
    from public.enquete_opcoes o
    left join public.enquete_votos v on v.opcao_id = o.id
    where o.post_id = any(ids_posts)
    group by o.post_id, o.id, o.texto, o.ordem
  ),
  totais as (
    select post_id, sum(votos) as total from contagem group by post_id
  )
  select
    c.post_id,
    c.opcao_id,
    c.texto,
    c.ordem,
    c.votos,
    case when t.total > 0 then round(100.0 * c.votos / t.total) else 0 end as pct
  from contagem c
  join totais t on t.post_id = c.post_id
  order by c.post_id, c.ordem;
$$;

grant execute on function public.listar_opcoes_enquete(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Criar post com enquete numa transação só (post + opções). Sem isso o
-- frontend faria dois inserts e poderia deixar uma enquete sem opções
-- se o segundo falhasse.
-- ---------------------------------------------------------------------
create or replace function public.criar_post(
  p_texto text default null,
  p_pergunta text default null,
  p_opcoes text[] default null,
  p_mesa_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_id uuid;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão ativa.';
  end if;

  if p_pergunta is not null and char_length(trim(p_pergunta)) > 0 then
    if p_opcoes is null or array_length(p_opcoes, 1) < 2 then
      raise exception 'Uma enquete precisa de pelo menos 2 opções.';
    end if;

    insert into public.posts (autor_id, mesa_id, tipo, pergunta)
    values (auth.uid(), p_mesa_id, 'enquete', trim(p_pergunta))
    returning id into novo_id;

    for i in 1 .. array_length(p_opcoes, 1) loop
      insert into public.enquete_opcoes (post_id, texto, ordem)
      values (novo_id, trim(p_opcoes[i]), i - 1);
    end loop;
  else
    if p_texto is null or char_length(trim(p_texto)) = 0 then
      raise exception 'O post precisa de texto ou de uma pergunta.';
    end if;

    insert into public.posts (autor_id, mesa_id, tipo, texto)
    values (auth.uid(), p_mesa_id, 'texto', trim(p_texto))
    returning id into novo_id;
  end if;

  return novo_id;
end;
$$;

grant execute on function public.criar_post(text, text, text[], uuid) to authenticated;
