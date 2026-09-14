-- =========================================================================
-- 0005_mensagens.sql
-- Conversas (1:1 ou em grupo), participantes e mensagens
-- =========================================================================

create table public.conversas (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('pessoa', 'grupo')),
  nome          text, -- obrigatório apenas para grupos
  emoji         text,
  criado_por    uuid not null references public.perfis(id) on delete cascade default auth.uid(),
  criado_em     timestamptz not null default now(),

  constraint nome_obrigatorio_se_grupo check (tipo = 'pessoa' or nome is not null)
);

create table public.conversa_participantes (
  conversa_id   uuid not null references public.conversas(id) on delete cascade,
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  entrou_em     timestamptz not null default now(),

  primary key (conversa_id, usuario_id)
);

create table public.mensagens (
  id            uuid primary key default gen_random_uuid(),
  conversa_id   uuid not null references public.conversas(id) on delete cascade,
  autor_id      uuid not null references public.perfis(id) on delete cascade,
  texto         text not null check (char_length(trim(texto)) > 0),
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Função auxiliar SECURITY DEFINER: verifica se o usuário atual participa
-- de uma conversa. Precisa ser SECURITY DEFINER (ignora RLS internamente)
-- porque uma policy de conversa_participantes que consultasse a própria
-- conversa_participantes causaria "infinite recursion detected in policy".
-- ---------------------------------------------------------------------
create or replace function public.eh_participante(id_conversa uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversa_participantes
    where conversa_id = id_conversa and usuario_id = auth.uid()
  );
$$;

alter table public.conversas enable row level security;
alter table public.conversa_participantes enable row level security;
alter table public.mensagens enable row level security;

-- conversas ------------------------------------------------------------
-- A policy de select inclui "criado_por = auth.uid()" além de
-- "eh_participante(id)" porque, no fluxo comum do Supabase
-- (.insert(...).select().single()), o INSERT precisa conseguir "ver" a
-- linha recém-criada via RETURNING antes de existir qualquer linha em
-- conversa_participantes — sem isso, o INSERT falha por RLS mesmo sendo
-- uma operação legítima do próprio criador da conversa.
create policy "Só participantes (ou quem criou) veem a conversa"
  on public.conversas for select
  using (public.eh_participante(id) or criado_por = auth.uid());

create policy "Usuário autenticado pode iniciar uma conversa"
  on public.conversas for insert
  with check (auth.uid() is not null and criado_por = auth.uid());

-- participantes --------------------------------------------------------
create policy "Só participantes veem a lista de participantes"
  on public.conversa_participantes for select
  using (public.eh_participante(conversa_id));

-- As duas condições cobrem: (1) quem criou a conversa adiciona os
-- participantes iniciais (checado contra conversas.criado_por, e não
-- contra eh_participante(), porque inserir vários participantes numa
-- única instrução — o caso comum ao criar a conversa — faz com que uma
-- linha ainda não esteja visível para a verificação de outra linha do
-- mesmo comando); (2) um membro já existente convida alguém para um
-- GRUPO (nunca para uma conversa 1:1 — isso viraria um grupo escondido).
-- Importante: NÃO existe uma regra de "auth.uid() = usuario_id" pura
-- aqui — isso permitiria qualquer pessoa se autoadicionar a qualquer
-- conversa, inclusive uma conversa privada de outras duas pessoas.
create policy "Adicionar participante à conversa"
  on public.conversa_participantes for insert
  with check (
    exists (
      select 1 from public.conversas
      where id = conversa_id and criado_por = auth.uid()
    )
    or (
      public.eh_participante(conversa_id)
      and exists (select 1 from public.conversas where id = conversa_id and tipo = 'grupo')
    )
  );

-- mensagens --------------------------------------------------------------
create policy "Só participantes veem as mensagens"
  on public.mensagens for select
  using (public.eh_participante(conversa_id));

create policy "Só participantes enviam mensagens"
  on public.mensagens for insert
  with check (auth.uid() = autor_id and public.eh_participante(conversa_id));
