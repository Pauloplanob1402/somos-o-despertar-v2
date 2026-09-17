-- =========================================================================
-- 0022_nome_padrao_identidade.sql
-- "Nova pessoa" é um rótulo neutro — não diz nada sobre quem alguém está
-- se tornando aqui. Jonah Berger (Palavras Mágicas) mostra que rótulos
-- de identidade puxam mais engajamento que descrições de ação: "seja um
-- eleitor" funciona melhor que "vote"; um substantivo de identidade dá
-- à pessoa um papel pra viver, não só uma tarefa pra cumprir.
--
-- Troca o nome e a arroba padrão de quem ainda não personalizou o
-- perfil — a pessoa entra já pertencendo a "quem está despertando",
-- antes mesmo de escrever o próprio nome.
-- =========================================================================

create or replace function public.lidar_com_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, arroba, cor)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Despertando'),
    coalesce(
      new.raw_user_meta_data ->> 'arroba',
      'despertando_' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data ->> 'cor', '#B8663F')
  );
  return new;
end;
$$;
