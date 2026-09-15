import Link from "next/link";

export const metadata = { title: "Privacidade — Despertar" };

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "var(--fonte-texto)" }}>
      <Link href="/" style={{ color: "var(--primaria)", fontSize: 14 }}>← Voltar</Link>
      <h1 style={{ fontFamily: "var(--fonte-display)", fontSize: 32, marginTop: 16 }}>Privacidade</h1>
      <p style={{ color: "var(--texto-fraco)", fontSize: 13.5, marginBottom: 28 }}>
        Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: 15, lineHeight: 1.7, color: "var(--texto)" }}>
        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>O que guardamos</h2>
          <p>
            Nome, arroba, bio e, se você reivindicar sua conta, e-mail ou identidade do
            Google. Suas publicações, curtidas, comentários, mesas e mensagens ficam
            associadas à sua conta.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>Quem vê o quê</h2>
          <p>
            Perfil, publicações, mesas e comentários são públicos dentro do app. Mensagens
            diretas só são visíveis para quem participa da conversa — nem a equipe do
            Despertar lê o conteúdo das suas mensagens no uso normal do produto.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>Inteligência artificial</h2>
          <p>
            Ao pedir um resumo de discussão ou receber sugestões de mesa, o texto da
            publicação, dos comentários ou seus interesses declarados podem ser enviados
            ao provedor de IA (Google Gemini) só para gerar aquela resposta específica —
            não são usados para treinar modelos de terceiros.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>Bloqueio e denúncia</h2>
          <p>
            Denúncias ficam registradas com o motivo e são visíveis só para quem denunciou
            e para a equipe de revisão. Bloquear alguém impede que vocês dois vejam o
            conteúdo um do outro e evita conversas novas entre as duas contas.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>Seus dados</h2>
          <p>
            Você pode editar nome e bio a qualquer momento na aba Perfil, e pedir a
            exclusão da sua conta e dos seus dados pelos canais de contato do app.
          </p>
        </section>
      </div>
    </div>
  );
}
