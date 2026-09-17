"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useMensagens } from "@/context/MensagensContext";
import { IconInicio, IconExplorar, IconMensagens, IconPerfil } from "./icons";

export function TopoMobile() {
  const pathname = usePathname();
  const { telaConversaAberta } = useMensagens();
  // dentro de uma conversa aberta, a conversa já tem seu próprio
  // cabeçalho (avatar + nome + voltar) — a barra genérica só tomaria
  // espaço de tela à toa, então some, como em qualquer app de chat.
  if (pathname === "/mensagens" && telaConversaAberta) return null;

  return (
    <div className="topo-mobile">
      DESPERT<span className="on">AR</span>
    </div>
  );
}

export function NavMobile() {
  const pathname = usePathname();
  const { abrirComposer } = useApp();
  const { conversas, telaConversaAberta } = useMensagens();
  const temNaoLidas = conversas.some((c) => c.naoLidas > 0);

  // essa é a correção do bug real: a barra fixa de baixo tem z-index
  // maior que o composer do chat, então SEMPRE cobria o campo de
  // digitar e o botão de enviar quando uma conversa estava aberta no
  // celular — o toque nunca chegava no botão, só o teclado (Enter)
  // continuava funcionando. Escondendo a barra aqui, o composer fica
  // livre pra receber toque, igual em qualquer app de mensagens.
  if (pathname === "/mensagens" && telaConversaAberta) return null;

  const item = (href: string, Icone: typeof IconInicio, badge?: boolean) => (
    <Link href={href} className={`nav-mobile-item ${pathname?.startsWith(href) ? "ativo" : ""}`}>
      <Icone />
      {badge ? <span className="nav-mobile-badge" /> : null}
    </Link>
  );

  return (
    <nav className="nav-mobile">
      {item("/inicio", IconInicio)}
      {item("/explorar", IconExplorar)}
      <button className="nav-mobile-item central" aria-label="Publicar" onClick={() => abrirComposer()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </button>
      {item("/mensagens", IconMensagens, temNaoLidas)}
      {item("/perfil", IconPerfil)}
    </nav>
  );
}
