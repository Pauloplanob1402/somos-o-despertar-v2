-- =========================================================================
-- 0019_mural_de_oracao.sql
-- O mural reúne TODOS os pedidos de oração da comunidade num só lugar —
-- não só os que caem no seu feed por algoritmo. É o "lugar de ir" quando
-- alguém abre o app querendo orar por alguém, mesmo sem seguir ninguém
-- ainda: o primeiro motivo pra ficar antes de ter uma rede de pessoas.
--
-- Duas visões, pela mesma função (parâmetro p_somente_sem_resposta):
--   - Recentes: todos os pedidos, mais novos primeiro.
--   - Aguardando oração: só quem ainda não recebeu nenhum "estou orando"
--     — os que mais precisam de alguém chegando perto.
-- =========================================================================

create or replace function public.listar_mural_oracao(
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

grant execute on function public.listar_mural_oracao(boolean, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Contagem pro cabeçalho do mural ("38 pedidos essa semana") — número
-- de prova social que já existia no versículo do dia, aplicado aqui.
-- ---------------------------------------------------------------------
create or replace function public.contar_pedidos_oracao_semana()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)
  from public.posts p
  where p.tipo = 'oracao'
    and p.criado_em > now() - interval '7 days'
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id);
$$;

grant execute on function public.contar_pedidos_oracao_semana() to authenticated;
