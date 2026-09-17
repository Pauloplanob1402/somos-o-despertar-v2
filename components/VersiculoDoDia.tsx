"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";

/**
 * A âncora de abertura do app: um conteúdo, uma ação, uma volta.
 *
 * Um conteúdo — o mesmo versículo pra todo mundo, escolhido pela data.
 * Uma ação — escrever a própria reflexão (vira post normal, com todo o
 *   resto do app em volta: curtida, comentário, mesa, perfil).
 * Uma volta — depois de responder, o card passa a mostrar quantas
 *   pessoas responderam também, e convida a ver o que elas escreveram.
 *
 * Nada de sequência ("você está no dia 7!") nem de aviso de falha: o
 * convite é diário, a cobrança não existe.
 */
export function VersiculoDoDia() {
  const { versiculo, carregandoVersiculo, abrirComposer } = useApp();

  if (carregandoVersiculo || !versiculo) return null;

  const outras = versiculo.jaRefleti
    ? versiculo.reflexoesCount - 1
    : versiculo.reflexoesCount;

  return (
    <section className="versiculo-dia" aria-label="Versículo do dia">
      <div className="versiculo-dia-topo">
        <span className="versiculo-dia-etiqueta">Versículo de hoje</span>
        {versiculo.tema ? <span className="versiculo-dia-tema">{versiculo.tema}</span> : null}
      </div>

      <blockquote className="versiculo-dia-texto">{versiculo.texto}</blockquote>
      <cite className="versiculo-dia-ref">{versiculo.referencia}</cite>

      <p className="versiculo-dia-convite">{versiculo.convite}</p>

      <div className="versiculo-dia-rodape">
        {versiculo.jaRefleti ? (
          <>
            <span className="versiculo-dia-feito">Você já refletiu hoje</span>
            <Link href="/reflexoes" className="botao-mini">
              {outras > 0
                ? `Ver o que ${outras} ${outras === 1 ? "pessoa escreveu" : "pessoas escreveram"}`
                : "Ver as reflexões de hoje"}
            </Link>
          </>
        ) : (
          <>
            <button
              className="botao-primario"
              style={{ padding: "7px 16px", fontSize: 12.5 }}
              onClick={() => abrirComposer({ versiculo })}
            >
              Escrever minha reflexão
            </button>
            {versiculo.reflexoesCount > 0 ? (
              <Link href="/reflexoes" className="versiculo-dia-social">
                {versiculo.reflexoesCount}{" "}
                {versiculo.reflexoesCount === 1
                  ? "pessoa já refletiu hoje"
                  : "pessoas já refletiram hoje"}
              </Link>
            ) : (
              <span className="versiculo-dia-social">Seja a primeira pessoa hoje</span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
