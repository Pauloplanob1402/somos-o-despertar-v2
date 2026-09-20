import { Suspense } from "react";
import { MuralDeOracaoView } from "@/components/MuralDeOracaoView";

export default function MuralDeOracaoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--texto-fraco)" }}>Carregando…</div>}>
      <MuralDeOracaoView />
    </Suspense>
  );
}
