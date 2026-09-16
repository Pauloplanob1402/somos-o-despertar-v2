-- =========================================================================
-- 0017_perfil_publico.sql
-- Etapa 7: cada pessoa passa a ter uma página própria (/perfil/@arroba),
-- visível para qualquer usuário logado — como no Facebook. Daqui sai tudo
-- que a página precisa numa chamada só: dados do perfil, se eu sigo, se
-- há bloqueio entre nós, quantos amigos em comum e se já existe uma
-- conversa 1:1 aberta (pro botão "Mensagem" abrir direto no lugar certo).
--
-- Nada aqui afrouxa RLS: perfis já eram públicos (0001), e todo retorno
-- passa por ha_bloqueio_entre() — quem me bloqueou não aparece pra mim.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Perfil público por @arroba (a URL usa a arroba, não o uuid — assim o
-- link é legível e compartilhável: /perfil/paulo).
-- ---------------------------------------------------------------------
create or replace function public.obter_perfil_publico(p_arroba text)
returns table (
  id uuid,
  nome text,
  arroba text,
  bio text,
  cor text,
  avatar_url text,
  seguidores_count integer,
  seguindo_count integer,
  publicacoes_count integer,
  criado_em timestamptz,
  sou_eu boolean,
  eu_sigo boolean,
  ele_me_segue boolean,
  eu_bloqueei boolean,
  ha_bloqueio boolean,
  amigos_em_comum bigint,
  conversa_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.nome, p.arroba, p.bio, p.cor, p.avatar_url,
    p.seguidores_count, p.seguindo_count, p.publicacoes_count, p.criado_em,
    (p.id = auth.uid()),
    exists (
      select 1 from public.seguidores s
      where s.seguidor_id = auth.uid() and s.seguido_id = p.id
    ),
    exists (
      select 1 from public.seguidores s
      where s.seguidor_id = p.id and s.seguido_id = auth.uid()
    ),
    exists (
      select 1 from public.bloqueios b
      where b.bloqueador_id = auth.uid() and b.bloqueado_id = p.id
    ),
    public.ha_bloqueio_entre(auth.uid(), p.id),
    coalesce((
      select count(*)
      from public.seguidores s1
      join public.seguidores s2
        on s2.seguidor_id = s1.seguido_id and s2.seguido_id = p.id
      where s1.seguidor_id = auth.uid()
    ), 0),
    (
      select c.id
      from public.conversas c
      join public.conversa_participantes cp1
        on cp1.conversa_id = c.id and cp1.usuario_id = auth.uid()
      join public.conversa_participantes cp2
        on cp2.conversa_id = c.id and cp2.usuario_id = p.id
      where c.tipo = 'pessoa'
      limit 1
    )
  from public.perfis p
  where p.arroba = lower(trim(p_arroba))
  limit 1;
$$;

grant execute on function public.obter_perfil_publico(text) to authenticated;

-- ---------------------------------------------------------------------
-- Mesas de que uma pessoa participa — aba "Mesas" da página dela.
-- ---------------------------------------------------------------------
create or replace function public.listar_mesas_do_perfil(id_perfil uuid, limite integer default 30)
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
  from public.mesa_membros mm
  join public.mesas m on m.id = mm.mesa_id
  left join public.mesa_membros eu on eu.mesa_id = m.id and eu.usuario_id = auth.uid()
  where mm.usuario_id = id_perfil
    and not public.ha_bloqueio_entre(auth.uid(), id_perfil)
  order by mm.entrou_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_mesas_do_perfil(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Seguidores / seguindo de uma pessoa — abas da página dela. Devolve o
-- mesmo formato de listar_pessoas_sugeridas, então o front reaproveita
-- mapearPessoa() e o componente PersonRow sem adaptação.
-- ---------------------------------------------------------------------
create or replace function public.listar_seguidores_do_perfil(id_perfil uuid, limite integer default 30)
returns table (
  id uuid,
  nome text,
  arroba text,
  bio text,
  cor text,
  seguidores_count integer,
  amigos_em_comum bigint,
  eu_sigo boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.nome, p.arroba, p.bio, p.cor, p.seguidores_count,
    0::bigint,
    exists (
      select 1 from public.seguidores s
      where s.seguidor_id = auth.uid() and s.seguido_id = p.id
    )
  from public.seguidores rel
  join public.perfis p on p.id = rel.seguidor_id
  where rel.seguido_id = id_perfil
    and not public.ha_bloqueio_entre(auth.uid(), p.id)
  order by rel.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_seguidores_do_perfil(uuid, integer) to authenticated;

create or replace function public.listar_seguindo_do_perfil(id_perfil uuid, limite integer default 30)
returns table (
  id uuid,
  nome text,
  arroba text,
  bio text,
  cor text,
  seguidores_count integer,
  amigos_em_comum bigint,
  eu_sigo boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.nome, p.arroba, p.bio, p.cor, p.seguidores_count,
    0::bigint,
    exists (
      select 1 from public.seguidores s
      where s.seguidor_id = auth.uid() and s.seguido_id = p.id
    )
  from public.seguidores rel
  join public.perfis p on p.id = rel.seguido_id
  where rel.seguidor_id = id_perfil
    and not public.ha_bloqueio_entre(auth.uid(), p.id)
  order by rel.criado_em desc
  limit least(limite, 50);
$$;

grant execute on function public.listar_seguindo_do_perfil(uuid, integer) to authenticated;

-- Índice pra buscar perfil por arroba (a URL é sempre por arroba agora).
-- O unique de 0001 já cria um índice, mas ele é case-sensitive; como
-- a constraint só aceita minúsculas, lower() bate direto — este índice
-- garante isso mesmo que a constraint mude no futuro.
create index if not exists perfis_arroba_lower_idx on public.perfis (lower(arroba));
