-- =========================================================================
-- 0023_mensagens_imagem.sql
-- Permite mensagens de imagem no chat (o botão "Anexar foto" já existia
-- na interface, mas não tinha suporte nenhum no banco — a coluna nem
-- existia e a mensagem exigia texto obrigatório).
--
-- Reaproveita o bucket "midias" (0015_storage_e_imagens.sql), que já é
-- público e já tem policy de upload restrita à própria pasta do usuário
-- — mesmo modelo usado pra imagem de post, só que agora também em
-- mensagens/{usuario}/arquivo. Isso significa que, assim como as imagens
-- de post, a URL da imagem não é protegida por RLS de fato — só não é
-- adivinhável (nome aleatório). Pra mensagens privadas de verdade, um
-- bucket privado com signed URL seria mais forte, mas é bem mais
-- trabalho; deixo como possível melhoria futura.
-- =========================================================================

alter table public.mensagens
  alter column texto drop not null;

alter table public.mensagens
  add column if not exists imagem_url text;

alter table public.mensagens
  drop constraint if exists mensagens_texto_check;

alter table public.mensagens
  add constraint mensagens_texto_ou_imagem check (
    (texto is not null and char_length(trim(texto)) > 0) or imagem_url is not null
  );
