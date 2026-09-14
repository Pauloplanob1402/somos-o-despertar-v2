"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { IconInicio, IconExplorar, IconMensagens, IconPerfil } from "./icons";

export function TopoMobile() {
  return (
    <div className="topo-mobile">
      DESPERT<span className="on">AR</span>
    </div>
  );
}

export function NavMobile() {
  const pathname = usePathname();
  const { abrirComposer } = useApp();

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
      <button className="nav-mobile-item central" aria-label="Publicar" onClick={abrirComposer}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </button>
      {item("/mensagens", IconMensagens, true)}
      {item("/perfil", IconPerfil)}
    </nav>
  );
}
