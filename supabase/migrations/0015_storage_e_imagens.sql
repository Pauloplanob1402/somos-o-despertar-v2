-- =========================================================================
-- 0015_storage_e_imagens.sql
-- Bucket de mídia pública pra imagens de post, com política de RLS que
-- só deixa cada pessoa enviar/apagar arquivos dentro da PRÓPRIA pasta
-- (o caminho do arquivo é sempre "{id_do_usuario}/nome-do-arquivo").
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('midias', 'midias', true)
on conflict (id) do nothing;

create policy "Mídias são públicas para leitura"
on storage.objects for select
using (bucket_id = 'midias');

create policy "Usuário envia mídia só na própria pasta"
on storage.objects for insert
with check (
  bucket_id = 'midias'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Usuário apaga só a própria mídia"
on storage.objects for delete
using (
  bucket_id = 'midias'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------
-- criar_post ganha um parâmetro novo (p_imagem_url). Como isso muda a
-- assinatura da função (5 parâmetros em vez de 4), precisa apagar a
-- versão antiga antes — senão o Postgres cria uma segunda função
-- "sobrecarregada" ao lado da antiga, em vez de substituí-la.
-- ---------------------------------------------------------------------
drop function if exists public.criar_post(text, text, text[], uuid);

create function public.criar_post(
  p_texto text default null,
  p_pergunta text default null,
  p_opcoes text[] default null,
  p_mesa_id uuid default null,
  p_imagem_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_id uuid;
  i integer;
  ultimo_post timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão ativa.';
  end if;

  select max(criado_em) into ultimo_post from public.posts where autor_id = auth.uid();
  if ultimo_post is not null and now() - ultimo_post < interval '15 seconds' then
    raise exception 'Espere alguns segundos antes de publicar de novo.';
  end if;

  if p_pergunta is not null and char_length(trim(p_pergunta)) > 0 then
    if p_opcoes is null or array_length(p_opcoes, 1) < 2 then
      raise exception 'Uma enquete precisa de pelo menos 2 opções.';
    end if;

    insert into public.posts (autor_id, mesa_id, tipo, pergunta, imagem_url)
    values (auth.uid(), p_mesa_id, 'enquete', trim(p_pergunta), p_imagem_url)
    returning id into novo_id;

    for i in 1 .. array_length(p_opcoes, 1) loop
      insert into public.enquete_opcoes (post_id, texto, ordem)
      values (novo_id, trim(p_opcoes[i]), i - 1);
    end loop;
  else
    if p_texto is null or char_length(trim(p_texto)) = 0 then
      raise exception 'O post precisa de texto ou de uma pergunta.';
    end if;

    insert into public.posts (autor_id, mesa_id, tipo, texto, imagem_url)
    values (auth.uid(), p_mesa_id, 'texto', trim(p_texto), p_imagem_url)
    returning id into novo_id;
  end if;

  return novo_id;
end;
$$;

grant execute on function public.criar_post(text, text, text[], uuid, text) to authenticated;
