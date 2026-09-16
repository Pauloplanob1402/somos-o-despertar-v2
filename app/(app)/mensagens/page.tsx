import { Suspense } from "react";
import { ConversationsView } from "@/components/Mensagens";

export default function MensagensPage() {
  return (
    <section className="view" style={{ padding: 0 }}>
      {/* useSearchParams (deep link /mensagens?c=<id>) exige Suspense no App Router */}
      <Suspense fallback={<div style={{ padding: 40, color: "var(--texto-fraco)" }}>Carregando…</div>}>
        <ConversationsView />
      </Suspense>
    </section>
  );
}
