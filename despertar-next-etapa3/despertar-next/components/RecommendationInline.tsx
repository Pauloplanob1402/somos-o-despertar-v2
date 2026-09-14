import { PESSOAS_RECOMENDADAS, usuarioPorId } from "@/lib/mock-data";
import { Avatar } from "./Avatar";

export function RecomendacaoSuaMesa() {
  const pessoas = PESSOAS_RECOMENDADAS.map(usuarioPorId).filter(Boolean);
  return (
    <div className="recomendacao-inline">
      <div className="recomendacao-titulo"><span className="ponto" />Sua Mesa</div>
      <div className="pessoas-empilhadas">
        {pessoas.map((p) => (
          <Avatar key={p!.id} nome={p!.nome} iniciais={p!.iniciais} cor={p!.cor} tamanho={34} />
        ))}
      </div>
      <p className="recomendacao-texto">
        <b>12 pessoas</b> que você segue estão refletindo sobre &quot;silêncio como disciplina espiritual&quot; agora.
      </p>
    </div>
  );
}

export function RecomendacaoPessoasComoVoce({ nomeMesa }: { nomeMesa: string }) {
  return (
    <div className="recomendacao-inline">
      <div className="recomendacao-titulo"><span className="ponto" />Pessoas como você</div>
      <p className="recomendacao-texto">
        <b>8 pessoas</b> em jornada parecida com a sua entraram na mesa <b>{nomeMesa}</b> essa semana.
      </p>
    </div>
  );
}
