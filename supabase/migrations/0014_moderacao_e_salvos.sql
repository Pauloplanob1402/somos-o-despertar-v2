-- =========================================================================
-- 0014_moderacao_e_salvos.sql
-- Etapa 6: transforma em de verdade o que até aqui era só um toast —
-- bloquear, denunciar, ocultar — e implementa Guardados. Também blinda
-- feed, busca, sugestões e mensagens contra gente bloqueada.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Bloqueios. O efeito é sempre nos dois sentidos: se eu bloqueio alguém,
-- nem eu vejo o post dela, nem ela vê o meu — e nenhuma das duas
-- consegue iniciar conversa com a outra. Isso é decidido nas funções lá
-- embaixo, não aqui na tabela.
-- ---------------------------------------------------------------------
create table public.bloqueios (
  bloqueador_id uuid not null references public.perfis(id) on delete cascade,
  bloqueado_id  uuid not null references public.perfis(id) on delete cascade,
  criado_em     timestamptz not null default now(),

  primary key (bloqueador_id, bloqueado_id),
  constraint nao_bloquear_a_si_mesmo check (bloqueador_id <> bloqueado_id)
);

alter table public.bloqueios enable row level security;

create policy "Usuário só vê os próprios bloqueios"
  on public.bloqueios for select
  using (auth.uid() = bloqueador_id);

create policy "Usuário bloqueia por conta própria"
  on public.bloqueios for insert
  with check (auth.uid() = bloqueador_id);

create policy "Usuário desbloqueia por conta própria"
  on public.bloqueios for delete
  using (auth.uid() = bloqueador_id);

create index bloqueios_bloqueado_id_idx on public.bloqueios (bloqueado_id);

-- ---------------------------------------------------------------------
-- Função auxiliar: existe bloqueio em QUALQUER sentido entre dois perfis?
-- Reaproveitada em feed, busca, sugestões e mensagens — assim a regra de
-- "bloqueio é mútuo" fica escrita uma vez só.
-- ---------------------------------------------------------------------
create or replace function public.ha_bloqueio_entre(id_a uuid, id_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.bloqueios
    where (bloqueador_id = id_a and bloqueado_id = id_b)
       or (bloqueador_id = id_b and bloqueado_id = id_a)
  );
$$;

-- ---------------------------------------------------------------------
-- Denúncias. Só quem denunciou vê a própria denúncia — não existe painel
-- de moderação nesta etapa (isso é trabalho de equipe/staff, com uma
-- role própria, fora do escopo de um MVP). O importante aqui é que toda
-- denúncia fica registrada de verdade, com motivo, pra dar pra revisar
-- depois.
-- ---------------------------------------------------------------------
create table public.denuncias (
  id                    uuid primary key default gen_random_uuid(),
  denunciante_id        uuid not null references public.perfis(id) on delete cascade,
  post_id               uuid references public.posts(id) on delete cascade,
  usuario_denunciado_id uuid references public.perfis(id) on delete cascade,
  motivo                text not null check (motivo in ('spam', 'odio', 'assedio', 'impropria', 'outro')),
  detalhe               text,
  status                text not null default 'pendente' check (status in ('pendente', 'revisada')),
  criado_em             timestamptz not null default now(),

  constraint precisa_de_alvo check (post_id is not null or usuario_denunciado_id is not null)
);

alter table public.denuncias enable row level security;

create policy "Usuário só vê as próprias denúncias"
  on public.denuncias for select
  using (auth.uid() = denunciante_id);

create policy "Usuário denuncia em seu próprio nome"
  on public.denuncias for insert
  with check (auth.uid() = denunciante_id);

create index denuncias_status_idx on public.denuncias (status) where status = 'pendente';

-- ---------------------------------------------------------------------
-- Posts ocultos: só afeta o MEU feed, não é denúncia nem bloqueio.
-- ---------------------------------------------------------------------
create table public.posts_ocultos (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  criado_em  timestamptz not null default now(),

  primary key (usuario_id, post_id)
);

alter table public.posts_ocultos enable row level security;

create policy "Usuário só vê os próprios posts ocultos"
  on public.posts_ocultos for select
  using (auth.uid() = usuario_id);

create policy "Usuário oculta por conta própria"
  on public.posts_ocultos for insert
  with check (auth.uid() = usuario_id);

create policy "Usuário desfaz ocultação por conta própria"
  on public.posts_ocultos for delete
  using (auth.uid() = usuario_id);

-- ---------------------------------------------------------------------
-- Guardados (bookmarks).
-- ---------------------------------------------------------------------
create table public.salvos (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  criado_em  timestamptz not null default now(),

  primary key (usuario_id, post_id)
);

alter table public.salvos enable row level security;

create policy "Usuário só vê os próprios salvos"
  on public.salvos for select
  using (auth.uid() = usuario_id);

create policy "Usuário salva por conta própria"
  on public.salvos for insert
  with check (auth.uid() = usuario_id);

create policy "Usuário remove o próprio salvo"
  on public.salvos for delete
  using (auth.uid() = usuario_id);

create or replace function public.listar_meus_salvos(limite integer default 30)
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
  salvo_em timestamptz
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

grant execute on function public.listar_meus_salvos(integer) to authenticated;

-- As três funções abaixo mudam de assinatura (ganham `eu_salvei`), então
-- precisam ser apagadas antes de recriadas — CREATE OR REPLACE não permite
-- mudar as colunas de retorno de uma função existente.
drop function if exists public.listar_feed(integer, integer);
drop function if exists public.listar_posts_do_perfil(uuid, integer);
drop function if exists public.listar_posts_da_mesa(uuid, integer);

-- =========================================================================
-- A partir daqui: recriar (CREATE OR REPLACE) as funções da Etapa 5 e 4
-- que precisam passar a respeitar bloqueios. Mesma assinatura de antes —
-- só o corpo muda.
-- =========================================================================

create function public.listar_feed(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
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

create or replace function public.listar_pessoas_sugeridas(limite integer default 20)
returns table (
  id uuid, nome text, arroba text, bio text, cor text,
  seguidores_count integer, amigos_em_comum bigint
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
    join public.seguidores s2 on s2.seguidor_id = s1.seguido_id and s2.seguido_id = p.id
    where s1.seguidor_id = auth.uid()
  ) comum on true
  where p.id <> auth.uid()
    and not exists (select 1 from public.seguidores where seguidor_id = auth.uid() and seguido_id = p.id)
    and not public.ha_bloqueio_entre(auth.uid(), p.id)
  order by comum.total desc nulls last, p.seguidores_count desc
  limit least(limite, 50);
$$;

create or replace function public.buscar(termo text)
returns table (
  tipo_resultado text, id uuid, titulo text, subtitulo text, detalhe text, cor text, emoji text
)
language sql
security definer
set search_path = public
stable
as $$
  (
    select 'pessoa', p.id, p.nome, '@' || p.arroba, p.bio, p.cor, null::text
    from public.perfis p
    where (p.nome ilike '%' || termo || '%' or p.arroba ilike '%' || termo || '%')
      and not public.ha_bloqueio_entre(auth.uid(), p.id)
    limit 10
  )
  union all
  (
    select 'mesa', m.id, m.nome, m.membros_count || ' membros', m.descricao, m.cor, m.emoji
    from public.mesas m
    where m.nome ilike '%' || termo || '%'
       or m.categoria ilike '%' || termo || '%'
       or m.descricao ilike '%' || termo || '%'
    limit 10
  )
  union all
  (
    select 'post', p.id, autor.nome, '@' || autor.arroba, coalesce(p.texto, p.pergunta), autor.cor, null::text
    from public.posts p
    join public.perfis autor on autor.id = p.autor_id
    where (p.texto ilike '%' || termo || '%' or p.pergunta ilike '%' || termo || '%')
      and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    order by p.criado_em desc
    limit 10
  );
$$;

-- criar_post: mesmo comportamento de antes, com uma trava simples
-- contra spam (não mais que 1 post a cada 15 segundos por pessoa).
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
create or replace function public.obter_ou_criar_conversa_pessoa(outro_usuario_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  id_existente uuid;
  id_nova uuid;
begin
  if outro_usuario_id = auth.uid() then
    raise exception 'Não é possível iniciar uma conversa consigo mesmo.';
  end if;

  if public.ha_bloqueio_entre(auth.uid(), outro_usuario_id) then
    raise exception 'Não é possível iniciar essa conversa.';
  end if;

  select c.id into id_existente
  from public.conversas c
  join public.conversa_participantes p1 on p1.conversa_id = c.id and p1.usuario_id = auth.uid()
  join public.conversa_participantes p2 on p2.conversa_id = c.id and p2.usuario_id = outro_usuario_id
  where c.tipo = 'pessoa'
  limit 1;

  if id_existente is not null then
    return id_existente;
  end if;

  insert into public.conversas (tipo, criado_por) values ('pessoa', auth.uid())
  returning id into id_nova;

  insert into public.conversa_participantes (conversa_id, usuario_id) values
    (id_nova, auth.uid()),
    (id_nova, outro_usuario_id);

  return id_nova;
end;
$$;
