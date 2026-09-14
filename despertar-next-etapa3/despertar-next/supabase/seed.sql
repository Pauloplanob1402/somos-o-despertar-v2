-- =========================================================================
-- seed.sql
-- Dados iniciais que não dependem de usuários reais (perfis/posts dependem
-- de auth.users, que só existem depois que alguém se cadastra de verdade —
-- isso volta na Etapa 3). As 5 mesas do protótipo já entram prontas.
-- =========================================================================

insert into public.mesas (nome, emoji, descricao, categoria, cor) values
  ('Despertar Diário', '🕊️', 'Uma mesa para quem está saindo do sono espiritual e quer se manter acordado, dia após dia.', 'Despertar', '#B8663F'),
  ('Silêncio & Presença', '🕯️', 'Práticas de silêncio, contemplação e presença para quem vive numa correria constante.', 'Silêncio', '#5C4A66'),
  ('Mesa da Comunhão', '🤝', 'Um espaço de partilha para quem quer viver a fé em comunidade, não sozinho.', 'Comunhão', '#8A6D3B'),
  ('Estudo da Palavra', '📖', 'Leitura e reflexão bíblica em grupo, sem pressa e sem cobrança.', 'Estudo da Palavra', '#6E7F6B'),
  ('Recomeços', '🌅', 'Para quem está reconstruindo a fé, a vida ou a si mesmo depois de um tempo difícil.', 'Recomeços', '#7A4B32')
on conflict (nome) do nothing;
