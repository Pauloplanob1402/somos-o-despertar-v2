import Link from "next/link";

export const metadata = { title: "Termos de uso — Despertar" };

export default function TermosPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "var(--fonte-texto)" }}>
      <Link href="/" style={{ color: "var(--primaria)", fontSize: 14 }}>← Voltar</Link>
      <h1 style={{ fontFamily: "var(--fonte-display)", fontSize: 32, marginTop: 16 }}>Termos de uso</h1>
      <p style={{ color: "var(--texto-fraco)", fontSize: 13.5, marginBottom: 28 }}>
        Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: 15, lineHeight: 1.7, color: "var(--texto)" }}>
        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>1. O que é o Despertar</h2>
          <p>
            O Despertar é uma rede social para pessoas em jornada de despertar espiritual
            encontrarem outras pessoas na mesma caminhada, compartilharem reflexões e
            participarem de mesas (comunidades temáticas).
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>2. Sua conta</h2>
          <p>
            Você pode usar o Despertar com uma sessão temporária (anônima) ou reivindicá-la
            com e-mail ou Google. Você é responsável pelo que publica com sua conta.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>3. Convivência</h2>
          <p>
            Não é permitido: discurso de ódio, assédio, spam, conteúdo impróprio, ou pressão
            espiritual sobre a caminhada de outra pessoa. Publicações denunciadas são
            revisadas; contas podem ser suspensas em caso de violação repetida.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>4. Conteúdo gerado por IA</h2>
          <p>
            Alguns recursos (resumo de discussões, sugestão de mesas) usam inteligência
            artificial. Esse conteúdo é identificado como gerado por IA e pode conter
            imprecisões — ele nunca substitui o julgamento da própria pessoa sobre sua fé
            ou sua caminhada.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--fonte-display)", fontSize: 20 }}>5. Encerramento</h2>
          <p>
            Você pode encerrar sua conta a qualquer momento. Reservamo-nos o direito de
            suspender contas que violem estes termos.
          </p>
        </section>

        <p style={{ color: "var(--texto-fraco)", fontSize: 13.5 }}>
          Dúvidas sobre estes termos? Fale com a equipe do Despertar pelos canais de contato
          divulgados no app.
        </p>
      </div>
    </div>
  );
}
