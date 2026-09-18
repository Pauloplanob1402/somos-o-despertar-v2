import { iniciaisDe } from "@/lib/mapeadores";

interface AvatarProps {
  nome: string;
  iniciais?: string;
  cor?: string;
  avatarUrl?: string | null;
  tamanho: number;
  className?: string;
}

export function Avatar({ nome, iniciais, cor = "#B8663F", avatarUrl, tamanho, className }: AvatarProps) {
  const texto = iniciais || iniciaisDe(nome);

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={nome}
        className={`avatar ${className ?? ""}`}
        style={{ width: tamanho, height: tamanho, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      className={`avatar ${className ?? ""}`}
      style={{
        width: tamanho,
        height: tamanho,
        background: cor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: Math.round(tamanho * 0.38),
        flexShrink: 0,
      }}
    >
      {texto}
    </div>
  );
}
