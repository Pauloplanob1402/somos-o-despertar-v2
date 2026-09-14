"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "./Avatar";
import { useApp } from "@/context/AppContext";
import {
  IconInicio, IconExplorar, IconMesas, IconPessoas,
  IconMensagens, IconNotificacoes, IconSalvos, IconPerfil,
} from "./icons";

const ITENS_NAV = [
  { href: "/inicio", label: "Início", Icone: IconInicio },
  { href: "/explorar", label: "Descobrir", Icone: IconExplorar },
  { href: "/mesas", label: "Mesas", Icone: IconMesas },
  { href: "/pessoas", label: "Pessoas", Icone: IconPessoas },
  { href: "/mensagens", label: "Mensagens", Icone: IconMensagens, badge: 7 },
  { href: "/notificacoes", label: "Notificações", Icone: IconNotificacoes, badge: 3 },
  { href: "/guardados", label: "Guardados", Icone: IconSalvos },
  { href: "/perfil", label: "Meu perfil", Icone: IconPerfil },
];

export function Sidebar() {
  const pathname = usePathname();
  const { abrirComposer } = useApp();
  const { perfil, carregando } = useAuth();

  return (
    <aside className="sidebar">
      <div className="marca">
        DESPERT<span className="on">AR</span>
      </div>

      <nav className="nav-lista">
        {ITENS_NAV.map((item) => {
          const ativo = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${ativo ? "ativo" : ""}`}
            >
              <span className="icone">
                <item.Icone />
              </span>
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>

      <button className="botao-publicar-lateral" onClick={abrirComposer}>
        Publicar
      </button>

      <Link href="/perfil" className="usuario-lateral">
        <Avatar
          nome={perfil?.nome ?? "…"}
          cor={perfil?.cor ?? "#B8663F"}
          tamanho={38}
        />
        <span className="usuario-lateral-nomes">
          <span className="nome">{carregando ? "Carregando…" : perfil?.nome ?? "Nova pessoa"}</span>
          <br />
          <span className="arroba">{perfil ? `@${perfil.arroba}` : ""}</span>
        </span>
      </Link>
    </aside>
  );
}
