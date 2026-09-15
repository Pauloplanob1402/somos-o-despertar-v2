-- =========================================================================
-- 0009_mensagens_realtime.sql
-- Suporte para a Etapa 4: marca até quando cada participante já leu uma
-- conversa (pra contar não lidas de verdade) e duas funções que o
-- frontend chama via RPC porque a lógica não dá pra expressar só com
-- select/insert direto respeitando RLS.
-- =========================================================================

alter table public.conversa_participantes
  add column lido_ate timestamptz not null default now();

comment on column public.conversa_participantes.lido_ate is
  'Toda mensagem desta conversa criada depois deste instante conta como não lida para este participante.';

-- ---------------------------------------------------------------------
-- listar_minhas_conversas(): a lista de conversas de quem chama, já com
-- a última mensagem, quem é "a outra pessoa" (em conversas 1:1) e a
-- contagem de não lidas — tudo numa chamada só, pra tela de Mensagens
-- não precisar de N+1 queries. SECURITY DEFINER porque agrega dados de
-- mais de uma tabela, mas o filtro por auth.uid() no JOIN principal
-- garante que só aparecem conversas de quem chamou.
-- ---------------------------------------------------------------------
create or replace function public.listar_minhas_conversas()
returns table (
  conversa_id uuid,
  tipo text,
  nome text,
  emoji text,
  outro_id uuid,
  outro_nome text,
  outro_arroba text,
  outro_cor text,
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

-- ---------------------------------------------------------------------
-- marcar_conversa_lida(): chamado quando a pessoa abre uma conversa.
-- ---------------------------------------------------------------------
create or replace function public.marcar_conversa_lida(id_conversa uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversa_participantes
  set lido_ate = now()
  where conversa_id = id_conversa and usuario_id = auth.uid();
$$;

grant execute on function public.marcar_conversa_lida(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- obter_ou_criar_conversa_pessoa(): acha a conversa 1:1 já existente
-- entre quem chama e outro_usuario_id, ou cria uma nova. Evita duplicar
-- conversas quando alguém clica em "mandar mensagem" mais de uma vez
-- pra mesma pessoa.
-- ---------------------------------------------------------------------
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

grant execute on function public.obter_ou_criar_conversa_pessoa(uuid) to authenticated;
