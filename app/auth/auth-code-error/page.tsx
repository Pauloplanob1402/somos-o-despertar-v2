import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="tela-onboarding">
      <div className="onboarding-card">
        <div className="onboarding-marca">
          DESPERT<span style={{ color: "#DCAE6C" }}>AR</span>
        </div>
        <div className="onboarding-passo ativa">
          <h1>Não deu certo dessa vez.</h1>
          <p className="descricao">
            O link de confirmação expirou ou já foi usado. Volte e tente entrar de novo.
          </p>
          <Link href="/" className="botao-primario" style={{ display: "inline-block", textDecoration: "none" }}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
