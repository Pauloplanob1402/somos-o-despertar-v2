-- =========================================================================
-- 0011_notificacoes_rpc.sql
-- Assim como listar_minhas_conversas() (0009), essa função devolve a
-- notificação já com o nome/arroba de quem praticou a ação e o nome da
-- mesa, quando aplicável — evita o frontend ter que rodar uma query
-- separada por perfil e adivinhar o nome da constraint de FK pra usar
-- o embed automático do PostgREST.
-- =========================================================================

create or replace function public.listar_minhas_notificacoes()
returns table (
  id uuid,
  tipo text,
  ator_id uuid,
  ator_nome text,
  ator_arroba text,
  ator_cor text,
  post_id uuid,
  mesa_id uuid,
  mesa_nome text,
  lida boolean,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    n.id,
    n.tipo,
    n.ator_id,
    ator.nome as ator_nome,
    ator.arroba as ator_arroba,
    ator.cor as ator_cor,
    n.post_id,
    n.mesa_id,
    mesa.nome as mesa_nome,
    n.lida,
    n.criado_em
  from public.notificacoes n
  left join public.perfis ator on ator.id = n.ator_id
  left join public.mesas mesa on mesa.id = n.mesa_id
  where n.usuario_id = auth.uid()
  order by n.criado_em desc
  limit 50;
$$;

grant execute on function public.listar_minhas_notificacoes() to authenticated;

create or replace function public.marcar_todas_notificacoes_lidas()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notificacoes set lida = true where usuario_id = auth.uid() and lida = false;
$$;

grant execute on function public.marcar_todas_notificacoes_lidas() to authenticated;
