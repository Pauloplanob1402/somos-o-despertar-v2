-- =========================================================================
-- 0007_gatilhos.sql
-- Gatilhos que mantêm contadores (curtidas_count, comentarios_count,
-- seguidores_count, seguindo_count, membros_count, publicacoes_count)
-- e que geram notificações automaticamente a partir de ações do usuário.
-- Todas as funções são SECURITY DEFINER: rodam com o dono da função,
-- então ignoram RLS e conseguem, por ex., inserir uma notificação para
-- OUTRO usuário (que a policy de insert normal não permitiria).
-- =========================================================================

-- posts.curtidas_count + notificação -------------------------------------
create or replace function public.ao_mudar_curtida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set curtidas_count = curtidas_count + 1 where id = new.post_id;

    insert into public.notificacoes (usuario_id, tipo, ator_id, post_id)
    select autor_id, 'curtida', new.usuario_id, new.post_id
    from public.posts
    where id = new.post_id and autor_id <> new.usuario_id;

    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set curtidas_count = greatest(curtidas_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger curtidas_apos_mudanca
  after insert or delete on public.curtidas
  for each row execute function public.ao_mudar_curtida();

-- posts.comentarios_count + notificação -----------------------------------
create or replace function public.ao_mudar_comentario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comentarios_count = comentarios_count + 1 where id = new.post_id;

    insert into public.notificacoes (usuario_id, tipo, ator_id, post_id)
    select autor_id, 'comentario', new.autor_id, new.post_id
    from public.posts
    where id = new.post_id and autor_id <> new.autor_id;

    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set comentarios_count = greatest(comentarios_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger comentarios_apos_mudanca
  after insert or delete on public.comentarios
  for each row execute function public.ao_mudar_comentario();

-- perfis.seguidores_count / seguindo_count + notificação -------------------
create or replace function public.ao_mudar_seguidor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.perfis set seguindo_count = seguindo_count + 1 where id = new.seguidor_id;
    update public.perfis set seguidores_count = seguidores_count + 1 where id = new.seguido_id;

    insert into public.notificacoes (usuario_id, tipo, ator_id)
    values (new.seguido_id, 'seguidor', new.seguidor_id);

    return new;
  elsif (tg_op = 'DELETE') then
    update public.perfis set seguindo_count = greatest(seguindo_count - 1, 0) where id = old.seguidor_id;
    update public.perfis set seguidores_count = greatest(seguidores_count - 1, 0) where id = old.seguido_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger seguidores_apos_mudanca
  after insert or delete on public.seguidores
  for each row execute function public.ao_mudar_seguidor();

-- perfis.publicacoes_count --------------------------------------------------
create or replace function public.ao_mudar_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.perfis set publicacoes_count = publicacoes_count + 1 where id = new.autor_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.perfis set publicacoes_count = greatest(publicacoes_count - 1, 0) where id = old.autor_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger posts_apos_mudanca
  after insert or delete on public.posts
  for each row execute function public.ao_mudar_post();

-- mesas.membros_count --------------------------------------------------------
create or replace function public.ao_mudar_membro_mesa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.mesas set membros_count = membros_count + 1 where id = new.mesa_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.mesas set membros_count = greatest(membros_count - 1, 0) where id = old.mesa_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger mesa_membros_apos_mudanca
  after insert or delete on public.mesa_membros
  for each row execute function public.ao_mudar_membro_mesa();
