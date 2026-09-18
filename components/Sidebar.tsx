"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useMensagens } from "@/context/MensagensContext";
import { useNotificacoes } from "@/context/NotificacoesContext";
import { Avatar } from "./Avatar";
import {
  IconInicio, IconExplorar, IconMesas, IconPessoas, IconOracao,
  IconMensagens, IconNotificacoes, IconSalvos,
} from "./icons";

export function Sidebar() {
  const pathname = usePathname();
  const { abrirComposer } = useApp();
  const { perfil, carregando } = useAuth();
  const { conversas } = useMensagens();
  const { naoLidas: notificacoesNaoLidas } = useNotificacoes();

  const mensagensNaoLidas = conversas.reduce((soma, c) => soma + c.naoLidas, 0);

  // Agrupados por frequência de uso, não em ordem alfabética/aleatória:
  // o essencial do dia a dia primeiro, utilidades depois — a divisória
  // visual ajuda o olho a "fatiar" 8 itens em dois grupos de 4 em vez
  // de escanear uma lista única (Lei da Proximidade, Yablonski).
  // "Meu perfil" saiu da lista: já existe como o cartão de avatar+nome
  // no rodapé, e repetir o mesmo destino nos dois lugares só competia
  // por atenção sem adicionar nada (nenhum app do gênero — Twitter,
  // Threads — repete "Perfil" no menu principal).
  type ItemNav = { href: string; label: string; Icone: typeof IconInicio; badge?: number };

  const ITENS_PRINCIPAIS: ItemNav[] = [
    { href: "/inicio", label: "Início", Icone: IconInicio },
    { href: "/explorar", label: "Descobrir", Icone: IconExplorar },
    { href: "/mesas", label: "Mesas", Icone: IconMesas },
    { href: "/mural-oracao", label: "Mural de oração", Icone: IconOracao },
  ];
  const ITENS_UTILITARIOS: ItemNav[] = [
    { href: "/pessoas", label: "Pessoas", Icone: IconPessoas },
    { href: "/mensagens", label: "Mensagens", Icone: IconMensagens, badge: mensagensNaoLidas },
    { href: "/notificacoes", label: "Notificações", Icone: IconNotificacoes, badge: notificacoesNaoLidas },
    { href: "/guardados", label: "Guardados", Icone: IconSalvos },
  ];

  const renderItem = (item: ItemNav) => {
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
  };

  return (
    <aside className="sidebar">
      <div className="marca">
        DESPERT<span className="on">AR</span>
      </div>

      <nav className="nav-lista">
        {ITENS_PRINCIPAIS.map(renderItem)}
        <div className="nav-divisor" />
        {ITENS_UTILITARIOS.map(renderItem)}
      </nav>

      <button className="botao-publicar-lateral" onClick={() => abrirComposer()}>
        Publicar
      </button>

      <Link href="/perfil" className="usuario-lateral">
        <Avatar
          nome={perfil?.nome ?? "…"}
          cor={perfil?.cor ?? "#B8663F"}
          avatarUrl={perfil?.avatar_url}
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
