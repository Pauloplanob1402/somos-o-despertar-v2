// Skeleton discreto pra troca do "Carregando..." parado por uma
// estrutura que já parece o post — reduz a sensação de tela travada
// e evita o feed "pular" quando o conteúdo real chega.
export function FeedSkeleton() {
  return (
    <div className="feed-skeleton" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div className="post-skeleton" key={i}>
          <div className="skeleton-bloco skeleton-avatar" />
          <div className="skeleton-linhas">
            <div className="skeleton-bloco skeleton-linha curta" />
            <div className="skeleton-bloco skeleton-linha longa" />
            <div className="skeleton-bloco skeleton-linha media" />
          </div>
        </div>
      ))}
    </div>
  );
}
