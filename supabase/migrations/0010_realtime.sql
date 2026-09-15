-- =========================================================================
-- 0010_realtime.sql
-- Liga o Supabase Realtime (postgres_changes) para mensagens e
-- notificações — sem isso, os INSERTs acontecem no banco normalmente,
-- mas nenhum cliente conectado recebe o evento ao vivo.
--
-- Todo projeto Supabase já vem com a publicação `supabase_realtime`
-- criada por padrão; o bloco abaixo só cria caso, por algum motivo, ela
-- não exista, e adiciona cada tabela apenas se ainda não estiver nela
-- (pra essa migration poder rodar mais de uma vez sem erro).
-- =========================================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens'
  ) then
    alter publication supabase_realtime add table public.mensagens;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end $$;

-- As policies de RLS de select já existentes (Etapa 2) também valem para
-- o Realtime: cada cliente só recebe eventos das linhas que já poderia
-- ler normalmente (participante da conversa; dono da notificação).
