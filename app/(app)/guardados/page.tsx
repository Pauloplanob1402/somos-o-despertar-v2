export default function GuardadosPage() {
  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Guardados</h2>
        <div className="sub">Reflexões que você guardou para revisitar</div>
      </div>
      <div style={{ padding: "70px 22px", textAlign: "center", color: "var(--texto-fraco)" }}>
        <p style={{ fontSize: 15 }}>Você ainda não guardou nenhuma reflexão.</p>
        <p style={{ fontSize: 13.5, marginTop: 6 }}>
          Toque em ··· em qualquer publicação para guardá-la aqui.
        </p>
      </div>
    </section>
  );
}
