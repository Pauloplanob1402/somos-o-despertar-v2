"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "./Avatar";

/**
 * Um lugar só pra decidir qual é a URL de uma pessoa. Se um dia a rota
 * mudar (/perfil/@x, /u/x…), muda aqui e o app inteiro acompanha.
 */
export function caminhoPerfil(arroba: string): string {
  return `/perfil/${arroba}`;
}

/**
 * Envolve qualquer conteúdo num link pro perfil da pessoa. O
 * stopPropagation existe porque nome e avatar costumam ficar dentro de
 * cards clicáveis (post, conversa) — clicar no nome tem que abrir o
 * perfil, e não a ação do card.
 */
export function LinkPessoa({
  arroba,
  children,
  className,
  style,
  title,
}: {
  arroba: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <Link
      href={caminhoPerfil(arroba)}
      className={`link-pessoa ${className ?? ""}`}
      style={style}
      title={title ?? `Ver o perfil de @${arroba}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

/** Avatar clicável — troca direta pelo <Avatar> em qualquer lugar. */
export function AvatarPessoa({
  arroba,
  nome,
  cor,
  avatarUrl,
  tamanho,
  className,
}: {
  arroba: string | null | undefined;
  nome: string;
  cor?: string;
  avatarUrl?: string | null;
  tamanho: number;
  className?: string;
}) {
  const avatar = <Avatar nome={nome} cor={cor} avatarUrl={avatarUrl} tamanho={tamanho} className={className} />;
  if (!arroba) return avatar;
  return (
    <LinkPessoa arroba={arroba} style={{ flexShrink: 0, display: "block" }}>
      {avatar}
    </LinkPessoa>
  );
}
