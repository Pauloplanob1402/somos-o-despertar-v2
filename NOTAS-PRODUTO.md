# Notas de produto — Despertar

## Restrições atuais (importante ler antes de sugerir features)

- **O app fica 100% no plano free enquanto não tiver base de usuários e
  receita.** Isso significa Supabase free tier (1GB storage, ~2GB banda/mês,
  500MB banco) e Vercel free (hobby).
- **NUNCA implementar vídeo (upload, reels, chamada de vídeo) enquanto
  estiver no free.** É o que mais rápido estoura banda/storage — mesmo
  poucos vídeos curtos por poucos usuários já comem a cota mensal. Só
  reconsiderar isso quando o app migrar pra um plano pago, e mesmo assim
  provavelmente usando um serviço de vídeo à parte (Cloudflare Stream,
  Mux) em vez do Supabase Storage direto.
- Toda feature nova deve ser avaliada primeiro pelo custo de storage/banda/
  linhas de banco, não só pelo valor de produto.

## Backlog de retenção (inspirado em Facebook/Instagram/TikTok, tudo free-friendly)

Já em discussão / priorizados:
1. Notificação push de verdade (Web Push/VAPID — grátis em qualquer volume)
2. Streak diário de reflexão/versículo (só contagem, sem custo)
3. Feed "Para Você" algorítmico (ajuste na query de pontuação já existente)
4. Stories de 24h (texto/foto, reaproveita o bucket "midias" já existente)

Ideias adicionais (todas sem custo de infra relevante):
- Botão de compartilhar nativo (Web Share API) pra levar posts/versículos
  pra fora do app (WhatsApp, Instagram) — grátis, gera tráfego de volta.
- Convite com link/código — cadastro via convite de amigo.
- Reações variadas além de curtir (❤️ 🙏 🔥), é só mais uma coluna/enum.
- Respostas aninhadas em comentários.
- Menções (@arroba) em posts/comentários com notificação.
- Hashtags/temas pra descoberta (indexação de texto, sem custo extra).
- "Quem visualizou seu perfil" — mais uma tabela pequena de views.
- Resumo anual tipo "Spotify Wrapped" com os dados que já existem
  (quantos versículos leu, mesas que participou, etc.) — bom gatilho de
  reengajamento sazonal.
- Gerar imagem compartilhável do versículo do dia via canvas/SVG no
  próprio navegador (sem servidor) — ótimo pra levar gente de fora pro app.

**Vídeo/Reels fica fora do backlog até sair do free tier.**
