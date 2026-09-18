-- =========================================================================
-- 0026_foto_de_capa.sql
-- Adiciona foto de capa de perfil (banner acima do avatar), no mesmo
-- molde do avatar_url — coluna simples, guardada no bucket "midias" já
-- existente.
-- =========================================================================

alter table public.perfis
  add column if not exists capa_url text;

-- obter_perfil_publico precisa devolver a capa também (muda o formato de
-- retorno, então precisa dropar antes de recriar). Baseado exatamente na
-- versão de 0017_perfil_publico.sql, só com capa_url adicionada — pra não
-- repetir o erro de 0024 (recriar uma função olhando pra versão errada
-- e perder colunas).
drop function if exists public.obter_perfil_publico(text);
create function public.obter_perfil_publico(p_arroba text)
returns table (
  id uuid,
  nome text,
  arroba text,
  bio text,
  cor text,
  avatar_url text,
  capa_url text,
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
    p.id, p.nome, p.arroba, p.bio, p.cor, p.avatar_url, p.capa_url,
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
