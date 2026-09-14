import { iniciaisDe } from "@/lib/mock-data";

interface AvatarProps {
  nome: string;
  iniciais?: string;
  cor?: string;
  tamanho: number;
  className?: string;
}

export function Avatar({ nome, iniciais, cor = "#B8663F", tamanho, className }: AvatarProps) {
  const texto = iniciais || iniciaisDe(nome);
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
      }}
    >
      {texto}
    </div>
  );
}
