-- =========================================================================
-- 0008_indices.sql
-- Índices para as consultas mais comuns do app (feed, perfil, mensagens,
-- notificações). Chaves primárias e de unicidade já geram índice sozinhas
-- e não precisam ser repetidas aqui.
-- =========================================================================

-- feed ordenado por data, e feed de uma mesa específica
create index posts_criado_em_idx on public.posts (criado_em desc);
create index posts_mesa_id_idx on public.posts (mesa_id) where mesa_id is not null;
create index posts_autor_id_idx on public.posts (autor_id);

-- comentários de um post, em ordem
create index comentarios_post_id_idx on public.comentarios (post_id, criado_em);

-- "quem eu sigo" e "quem me segue"
create index seguidores_seguido_id_idx on public.seguidores (seguido_id);

-- mesas de um usuário ("perfil > Comunidades")
create index mesa_membros_usuario_id_idx on public.mesa_membros (usuario_id);

-- lista de conversas de um usuário, e mensagens de uma conversa em ordem
create index conversa_participantes_usuario_id_idx on public.conversa_participantes (usuario_id);
create index conversas_criado_por_idx on public.conversas (criado_por);
create index mensagens_conversa_id_idx on public.mensagens (conversa_id, criado_em);

-- notificações não lidas de um usuário, mais recentes primeiro
create index notificacoes_usuario_id_idx on public.notificacoes (usuario_id, criado_em desc);
create index notificacoes_nao_lidas_idx on public.notificacoes (usuario_id) where lida = false;

-- busca por arroba e por nome
create index perfis_nome_idx on public.perfis using gin (to_tsvector('portuguese', nome));
