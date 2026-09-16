-- =========================================================================
-- 0018_versiculo_do_dia_e_oracao.sql
-- O laço diário do Despertar:
--
--   1) VERSÍCULO DO DIA — a mesma passagem para todo mundo, escolhida de
--      forma determinística pela data (nada de aleatório: duas pessoas
--      conversando sobre "o versículo de hoje" precisam ver o mesmo).
--      Quem responde publica uma reflexão, que é um post normal ligado
--      ao versículo — então ela aparece no feed, nas mesas, no perfil e
--      pode ser curtida e comentada como qualquer outra.
--
--   2) PEDIDO DE ORAÇÃO — um terceiro tipo de post. Em vez de curtida,
--      ele recebe "estou orando por você", que notifica quem pediu com
--      nome e rosto. É o retorno humano que faz a pessoa voltar.
--
-- Nenhum dos dois inventa contador de sequência nem pune quem falta —
-- o convite é diário, a cobrança não existe.
-- =========================================================================

-- =====================================================================
-- 1. VERSÍCULOS
-- =====================================================================

create table public.versiculos (
  id          uuid primary key default gen_random_uuid(),
  ordem       integer not null unique,     -- posição na rotação diária
  referencia  text not null,               -- "Salmos 23.1"
  texto       text not null,
  tema        text not null default '',    -- "confiança", "perdão"…
  convite     text not null,               -- a pergunta que abre a reflexão
  criado_em   timestamptz not null default now()
);

comment on table public.versiculos is
  'Rotação do versículo do dia. A ordem define o ciclo; ao chegar no fim, recomeça.';

alter table public.versiculos enable row level security;

create policy "Versículos são visíveis a todos"
  on public.versiculos for select
  using (true);

-- Posts podem estar ligados ao versículo do dia (reflexão).
alter table public.posts
  add column versiculo_id uuid references public.versiculos(id) on delete set null;

create index posts_versiculo_id_idx on public.posts (versiculo_id, criado_em desc);

-- ---------------------------------------------------------------------
-- O versículo de hoje. A escolha é (dias desde uma data fixa) % total,
-- no fuso de São Paulo — assim o dia "vira" à meia-noite de quem usa o
-- app, e não às 21h por causa do UTC.
--
-- Já traz também: eu refleti hoje? e quantas pessoas refletiram — esse
-- número é a prova social que faz a pessoa querer ver as respostas.
-- ---------------------------------------------------------------------
create or replace function public.obter_versiculo_do_dia()
returns table (
  id uuid,
  referencia text,
  texto text,
  tema text,
  convite text,
  ja_refleti boolean,
  meu_post_id uuid,
  reflexoes_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as dia
  ),
  escolhido as (
    select v.*
    from public.versiculos v, hoje
    where v.ordem = (
      ((hoje.dia - date '2026-01-01') % greatest((select count(*) from public.versiculos), 1))
      + 1
    )
    limit 1
  )
  select
    e.id, e.referencia, e.texto, e.tema, e.convite,
    exists (
      select 1 from public.posts p
      where p.versiculo_id = e.id
        and p.autor_id = auth.uid()
        and (p.criado_em at time zone 'America/Sao_Paulo')::date = (select dia from hoje)
    ),
    (
      select p.id from public.posts p
      where p.versiculo_id = e.id
        and p.autor_id = auth.uid()
        and (p.criado_em at time zone 'America/Sao_Paulo')::date = (select dia from hoje)
      order by p.criado_em desc
      limit 1
    ),
    (
      select count(*) from public.posts p
      where p.versiculo_id = e.id
        and (p.criado_em at time zone 'America/Sao_Paulo')::date = (select dia from hoje)
        and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    )
  from escolhido e;
$$;

grant execute on function public.obter_versiculo_do_dia() to authenticated;

-- ---------------------------------------------------------------------
-- As reflexões de hoje sobre o versículo do dia — a página que a pessoa
-- abre depois de escrever a dela ("o que os outros responderam?").
-- ---------------------------------------------------------------------
create or replace function public.listar_reflexoes_do_dia(limite integer default 30)
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
    p.criado_em
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
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

grant execute on function public.listar_reflexoes_do_dia(integer) to authenticated;

-- =====================================================================
-- 2. PEDIDOS DE ORAÇÃO
-- =====================================================================

-- posts.tipo ganha 'oracao'. As duas constraints são recriadas porque a
-- de conteúdo também precisa aceitar o tipo novo.
alter table public.posts drop constraint if exists posts_tipo_check;
alter table public.posts drop constraint if exists conteudo_obrigatorio;

alter table public.posts
  add constraint posts_tipo_check check (tipo in ('texto', 'enquete', 'oracao'));

alter table public.posts
  add constraint conteudo_obrigatorio check (
    (tipo in ('texto', 'oracao') and texto is not null and char_length(trim(texto)) > 0)
    or
    (tipo = 'enquete' and pergunta is not null and char_length(trim(pergunta)) > 0)
  );

alter table public.posts
  add column oracoes_count integer not null default 0;

create table public.oracoes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  criado_em   timestamptz not null default now(),

  primary key (post_id, usuario_id)
);

comment on table public.oracoes is
  'Quem está orando por um pedido. Diferente da curtida: gera notificação com nome e rosto.';

alter table public.oracoes enable row level security;

create policy "Quem está orando é visível a todos"
  on public.oracoes for select
  using (true);

create policy "Usuário ora em seu próprio nome"
  on public.oracoes for insert
  with check (auth.uid() = usuario_id);

create policy "Usuário pode desfazer"
  on public.oracoes for delete
  using (auth.uid() = usuario_id);

-- notificações ganham o tipo 'oracao'
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes
  add constraint notificacoes_tipo_check check (
    tipo in ('curtida', 'comentario', 'seguidor', 'convite_mesa', 'mensagem', 'oracao')
  );

-- contador + notificação, no mesmo molde dos gatilhos de 0007
create or replace function public.ao_mudar_oracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set oracoes_count = oracoes_count + 1 where id = new.post_id;

    insert into public.notificacoes (usuario_id, tipo, ator_id, post_id)
    select autor_id, 'oracao', new.usuario_id, new.post_id
    from public.posts
    where id = new.post_id and autor_id <> new.usuario_id;

    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set oracoes_count = greatest(oracoes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger oracoes_apos_mudanca
  after insert or delete on public.oracoes
  for each row execute function public.ao_mudar_oracao();

-- ---------------------------------------------------------------------
-- Quem está orando por um pedido — os rostinhos embaixo do post. É o
-- que transforma um número num grupo de pessoas com nome.
-- ---------------------------------------------------------------------
create or replace function public.listar_quem_orou(id_post uuid, limite integer default 12)
returns table (id uuid, nome text, arroba text, cor text, criado_em timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome, p.arroba, p.cor, o.criado_em
  from public.oracoes o
  join public.perfis p on p.id = o.usuario_id
  where o.post_id = id_post
    and not public.ha_bloqueio_entre(auth.uid(), p.id)
  order by o.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_quem_orou(uuid, integer) to authenticated;

-- =====================================================================
-- 3. criar_post: ganha tipo e versículo
-- =====================================================================
drop function if exists public.criar_post(text, text, text[], uuid, text, text, text, text, text, text);

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

    if p_tipo not in ('texto', 'oracao') then
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

grant execute on function public.criar_post(
  text, text, text[], uuid, text, text, text, text, text, text, text, uuid
) to authenticated;

-- =====================================================================
-- 4. As listagens de post ganham versículo + oração
-- =====================================================================
drop function if exists public.listar_feed(integer, integer);
drop function if exists public.listar_posts_do_perfil(uuid, integer);
drop function if exists public.listar_posts_da_mesa(uuid, integer);
drop function if exists public.listar_meus_salvos(integer);

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
      + ln(1 + p.curtidas_count + 2 * p.comentarios_count + 2 * p.oracoes_count)
      + 5.0 * exp(-extract(epoch from (now() - p.criado_em)) / 43200.0)
    ) as pontuacao
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
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
    p.criado_em,
    s.criado_em as salvo_em
  from public.salvos s
  join public.posts p on p.id = s.post_id
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where s.usuario_id = auth.uid()
  order by s.criado_em desc
  limit least(limite, 100);
$$;

grant execute on function public.listar_feed(integer, integer) to authenticated;
grant execute on function public.listar_posts_do_perfil(uuid, integer) to authenticated;
grant execute on function public.listar_posts_da_mesa(uuid, integer) to authenticated;
grant execute on function public.listar_meus_salvos(integer) to authenticated;

-- =====================================================================
-- 5. Rotação inicial — 30 dias
--
-- IMPORTANTE: o texto abaixo segue a tradição de Almeida, em domínio
-- público. Se você quiser usar NVI, NTLH, ARA ou qualquer edição
-- moderna, é preciso licença do detentor dos direitos — nesse caso,
-- troque os textos aqui antes de publicar. As referências e os convites
-- são seus e podem ficar como estão.
--
-- Para ampliar o ciclo: insira novas linhas continuando a ordem (31, 32…).
-- A função do dia se ajusta sozinha ao total.
-- =====================================================================

insert into public.versiculos (ordem, referencia, texto, tema, convite) values
(1,  'Salmos 23.1', 'O Senhor é o meu pastor; nada me faltará.', 'confiança', 'O que tem faltado em você hoje — e o que seria confiar mesmo assim?'),
(2,  'Provérbios 3.5', 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.', 'confiança', 'Onde você tem tentado resolver tudo na base do seu próprio entendimento?'),
(3,  'Salmos 46.10', 'Aquietai-vos e sabei que eu sou Deus.', 'silêncio', 'Quando foi a última vez que você ficou em silêncio de verdade?'),
(4,  'Mateus 11.28', 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.', 'descanso', 'Que peso você está carregando sozinho nesta semana?'),
(5,  'Filipenses 4.6', 'Não estejais inquietos por coisa alguma; antes, as vossas petições sejam conhecidas diante de Deus.', 'ansiedade', 'Qual preocupação você ainda não colocou em oração?'),
(6,  'Isaías 41.10', 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.', 'medo', 'De que você tem tido medo ultimamente?'),
(7,  'Salmos 51.10', 'Cria em mim, ó Deus, um coração puro e renova em mim um espírito reto.', 'renovo', 'O que no seu coração precisa ser renovado hoje?'),
(8,  'Lamentações 3.23', 'As misericórdias do Senhor se renovam cada manhã; grande é a tua fidelidade.', 'recomeço', 'O que você precisa recomeçar hoje, sem culpa?'),
(9,  'João 13.34', 'Que vos ameis uns aos outros; como eu vos amei, que também vos ameis uns aos outros.', 'amor', 'Quem você tem achado difícil amar — e por quê?'),
(10, 'Tiago 1.19', 'Todo o homem seja pronto para ouvir, tardio para falar, tardio para se irar.', 'escuta', 'Em qual conversa desta semana você falou mais do que ouviu?'),
(11, 'Salmos 139.23', 'Sonda-me, ó Deus, e conhece o meu coração; prova-me e conhece os meus pensamentos.', 'sinceridade', 'O que você tem evitado olhar dentro de si?'),
(12, 'Gálatas 6.2', 'Levai as cargas uns dos outros e assim cumprireis a lei de Cristo.', 'comunhão', 'De quem é a carga que você pode ajudar a levar hoje?'),
(13, 'Salmos 34.18', 'Perto está o Senhor dos que têm o coração quebrantado.', 'dor', 'Que dor você tem guardado sem contar a ninguém?'),
(14, 'Provérbios 4.23', 'Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as saídas da vida.', 'cuidado', 'O que anda entrando no seu coração sem você perceber?'),
(15, 'Colossenses 3.13', 'Suportai-vos uns aos outros e perdoai-vos uns aos outros.', 'perdão', 'Quem você ainda não conseguiu perdoar?'),
(16, 'Salmos 37.5', 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', 'entrega', 'Que decisão você está segurando na mão fechada?'),
(17, 'Mateus 6.34', 'Não vos inquieteis, pois, pelo dia de amanhã, porque o dia de amanhã cuidará de si mesmo.', 'presente', 'Que amanhã você está vivendo antes da hora?'),
(18, 'Romanos 12.12', 'Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.', 'perseverança', 'Em que você tem perseverado mesmo sem ver resultado?'),
(19, 'Salmos 121.1', 'Levantarei os meus olhos para os montes, de onde vem o meu socorro.', 'socorro', 'Para onde você tem olhado quando precisa de ajuda?'),
(20, 'Efésios 4.32', 'Sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros.', 'bondade', 'Com quem você poderia ser mais gentil esta semana?'),
(21, 'Salmos 91.1', 'Aquele que habita no esconderijo do Altíssimo à sombra do Onipotente descansará.', 'abrigo', 'Onde você tem buscado abrigo quando as coisas apertam?'),
(22, '1 Pedro 5.7', 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.', 'ansiedade', 'O que você já devia ter soltado há tempo?'),
(23, 'Josué 1.9', 'Sê forte e corajoso; não temas, nem te espantes, porque o Senhor, teu Deus, é contigo.', 'coragem', 'Que passo você tem adiado por falta de coragem?'),
(24, 'Salmos 119.105', 'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.', 'direção', 'Que decisão está pedindo direção na sua vida agora?'),
(25, 'Mateus 5.9', 'Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus.', 'paz', 'Que conflito seu está esperando um primeiro passo?'),
(26, 'Eclesiastes 3.1', 'Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.', 'tempo', 'Que tempo você está vivendo — de plantar ou de esperar?'),
(27, 'Salmos 103.2', 'Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum de seus benefícios.', 'gratidão', 'Cite uma coisa boa desta semana que passou despercebida.'),
(28, 'Hebreus 10.24', 'Consideremo-nos uns aos outros, para nos estimularmos ao amor e às boas obras.', 'comunhão', 'Quem precisa ouvir uma palavra sua hoje?'),
(29, 'Salmos 27.1', 'O Senhor é a minha luz e a minha salvação; a quem temerei?', 'segurança', 'Que medo perde a força quando você olha pra trás?'),
(30, 'Miqueias 6.8', 'Que pratiques a justiça, e ames a misericórdia, e andes humildemente com o teu Deus.', 'caminho', 'Qual dos três tem sido mais difícil pra você: justiça, misericórdia ou humildade?');
