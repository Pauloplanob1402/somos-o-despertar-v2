-- =========================================================================
-- 0027_reacoes.sql
-- Reações (❤️ 🙏 🔥) em vez de só curtir. Propositalmente NÃO mexe em
-- nenhuma função existente (listar_feed etc.) — só adiciona uma coluna
-- na tabela que já existe. curtidas_count continua contando o total de
-- reações (de qualquer tipo), sem quebrar nada que já depende dele.
-- =========================================================================

alter table public.curtidas
  add column if not exists tipo text not null default 'curtir';

alter table public.curtidas
  drop constraint if exists curtidas_tipo_check;

alter table public.curtidas
  add constraint curtidas_tipo_check check (tipo in ('curtir', 'oracao', 'fogo'));

-- Devolve, pra um conjunto de posts, qual reação EU fiz em cada um (se
-- fiz). Usada só como reforço visual (mostrar o emoji certo mesmo depois
-- de recarregar a página) — o "reagi ou não" que já existe (eu_curti)
-- não muda em nada.
create or replace function public.minhas_reacoes(ids_post uuid[])
returns table (post_id uuid, tipo text)
language sql
security definer
set search_path = public
stable
as $$
  select c.post_id, c.tipo
  from public.curtidas c
  where c.usuario_id = auth.uid() and c.post_id = any(ids_post);
$$;

grant execute on function public.minhas_reacoes(uuid[]) to authenticated;
