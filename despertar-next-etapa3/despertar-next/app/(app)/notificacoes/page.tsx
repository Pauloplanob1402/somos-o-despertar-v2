import { NOTIFICACOES } from "@/lib/mock-data";

export default function NotificacoesPage() {
  return (
    <section className="view">
      <div className="topo-secao"><h2>Notificações</h2></div>
      <div>
        {NOTIFICACOES.map((n, i) => (
          <div className={`notificacao ${n.lida ? "" : "nao-lida"}`} key={i}>
            <div className="notif-icone" style={{ background: n.cor }}>{n.icone}</div>
            <div>
              <div className="notif-texto" dangerouslySetInnerHTML={{ __html: n.texto }} />
              <div className="notif-tempo">{n.tempo}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
