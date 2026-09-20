-- =========================================================================
-- 0028_streak_e_para_voce.sql
-- Duas features, ambas em cima de tabelas/funções NOVAS — nenhuma função
-- existente (listar_feed etc.) é tocada, pra não repetir o erro de 0024.
--
-- 1) Sequência diária (streak): toda vez que a pessoa publica QUALQUER
--    post, marca "presença" no dia de hoje. obter_minha_sequencia() conta
--    quantos dias seguidos até hoje (ou até ontem, se ainda não fez nada
--    hoje — assim o número não zera de manhã antes da pessoa ter chance
--    de agir).
-- 2) Feed "Para Você": função nova e separada de listar_feed, mostrando
--    só gente que a pessoa AINDA não segue, ordenado por quanto o post
--    está bombando — puro descoberta, sem duplicar o feed principal.
-- =========================================================================

create table if not exists public.presencas_diarias (
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  dia         date not null,
  criado_em   timestamptz not null default now(),
  primary key (usuario_id, dia)
);

alter table public.presencas_diarias enable row level security;

create policy "Cada um vê só a própria sequência"
  on public.presencas_diarias for select
  using (auth.uid() = usuario_id);

-- só o gatilho abaixo escreve aqui (security definer), não precisa de
-- policy de insert pro usuário comum.

create or replace function public.ao_publicar_marca_presenca()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.presencas_diarias (usuario_id, dia)
  values (new.autor_id, current_date)
  on conflict (usuario_id, dia) do nothing;
  return new;
end;
$$;

drop trigger if exists posts_marca_presenca on public.posts;
create trigger posts_marca_presenca
  after insert on public.posts
  for each row execute function public.ao_publicar_marca_presenca();

create or replace function public.obter_minha_sequencia()
returns table (dias integer, ativo_hoje boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  cursor_dia date := current_date;
  contagem integer := 0;
  fez_hoje boolean;
begin
  select exists(
    select 1 from public.presencas_diarias
    where usuario_id = auth.uid() and dia = current_date
  ) into fez_hoje;

  if not fez_hoje then
    cursor_dia := current_date - 1;
  end if;

  while exists (
    select 1 from public.presencas_diarias
    where usuario_id = auth.uid() and dia = cursor_dia
  ) loop
    contagem := contagem + 1;
    cursor_dia := cursor_dia - 1;
  end loop;

  return query select contagem, fez_hoje;
end;
$$;

grant execute on function public.obter_minha_sequencia() to authenticated;

-- Feed "Para Você" -----------------------------------------------------
-- Mesmo formato de colunas do listar_feed (pra reaproveitar mapearPost
-- no front sem nenhuma adaptação), mas só gente que eu NÃO sigo ainda —
-- puro descobrimento, ranqueado por quanto tá bombando agora.
create or replace function public.listar_para_voce(
  limite integer default 20,
  deslocamento integer default 0
)
returns table (
  id uuid, autor_id uuid, autor_nome text, autor_arroba text, autor_cor text, autor_avatar_url text,
  mesa_id uuid, mesa_nome text, mesa_emoji text,
  tipo text, texto text, pergunta text, imagem_url text,
  link_url text, link_titulo text, link_descricao text, link_imagem text, link_dominio text,
  versiculo_id uuid, versiculo_referencia text,
  curtidas_count integer, comentarios_count integer, oracoes_count integer,
  eu_curti boolean, minha_opcao_id uuid, eu_salvei boolean, eu_orei boolean,
  testemunho_id uuid, respondido_em timestamptz,
  pedido_original_id uuid, pedido_original_texto text,
  criado_em timestamptz, pontuacao double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.autor_id, autor.nome, autor.arroba, autor.cor, autor.avatar_url,
    p.mesa_id, mesa.nome, mesa.emoji,
    p.tipo, p.texto, p.pergunta, p.imagem_url,
    p.link_url, p.link_titulo, p.link_descricao, p.link_imagem, p.link_dominio,
    p.versiculo_id, vers.referencia,
    p.curtidas_count, p.comentarios_count, p.oracoes_count,
    (curti.post_id is not null),
    voto.opcao_id,
    (salvo.post_id is not null),
    (orei.post_id is not null),
    p.testemunho_id, p.respondido_em,
    p.pedido_original_id, pedido_orig.texto,
    p.criado_em,
    (
      ln(1 + p.curtidas_count + 2 * p.comentarios_count + 2 * p.oracoes_count)
      + 3.0 * exp(-extract(epoch from (now() - p.criado_em)) / 86400.0)
    ) as pontuacao
  from public.posts p
  join public.perfis autor on autor.id = p.autor_id
  left join public.mesas mesa on mesa.id = p.mesa_id
  left join public.versiculos vers on vers.id = p.versiculo_id
  left join public.posts pedido_orig on pedido_orig.id = p.pedido_original_id
  left join public.curtidas curti on curti.post_id = p.id and curti.usuario_id = auth.uid()
  left join public.enquete_votos voto on voto.post_id = p.id and voto.usuario_id = auth.uid()
  left join public.seguidores sigo on sigo.seguido_id = p.autor_id and sigo.seguidor_id = auth.uid()
  left join public.salvos salvo on salvo.post_id = p.id and salvo.usuario_id = auth.uid()
  left join public.oracoes orei on orei.post_id = p.id and orei.usuario_id = auth.uid()
  where p.autor_id <> auth.uid()
    and sigo.seguido_id is null
    and not public.ha_bloqueio_entre(auth.uid(), p.autor_id)
    and not exists (
      select 1 from public.posts_ocultos po
      where po.post_id = p.id and po.usuario_id = auth.uid()
    )
    and p.curtidas_count + p.comentarios_count + p.oracoes_count > 0
  order by pontuacao desc, p.criado_em desc
  limit least(limite, 50)
  offset deslocamento;
$$;

grant execute on function public.listar_para_voce(integer, integer) to authenticated;
