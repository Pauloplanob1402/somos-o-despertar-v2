import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  ...props,
});

export const IconInicio = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" /></svg>
);
export const IconExplorar = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconMesas = (p: IconProps) => (
  <svg {...base(p)}><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M2 20c0-3 3-5 6-5s6 2 6 5" /><path d="M10 20c0-3 3-5 6-5s6 2 6 5" /></svg>
);
export const IconPessoas = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
);
export const IconMensagens = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 5h16v11H8l-4 4z" /></svg>
);
export const IconNotificacoes = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const IconSalvos = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 3h12v18l-6-4-6 4z" /></svg>
);
export const IconPerfil = IconPessoas;
export const IconCoracao = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 20s-7-4.5-9.5-9C1 7.5 3 4 6.5 4 9 4 11 6 12 7.5 13 6 15 4 17.5 4 21 4 23 7.5 21.5 11 19 15.5 12 20 12 20z" /></svg>
);
export const IconComentar = IconMensagens;
export const IconCompartilhar = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" /></svg>
);
export const IconFoto = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="m21 17-5-5-4 4-2-2-5 5" /></svg>
);
export const IconVideo = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></svg>
);
export const IconEnquete = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
);
export const IconMais = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.2, strokeLinecap: "round", ...p })}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>
);
export const IconBuscar = IconExplorar;
export const IconEnviar = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
);
export const IconEmoji = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>
);
export const IconAudio = (p: IconProps) => (
  <svg {...base(p)}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v5" /></svg>
);
export const IconVoltar = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconLink = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M10.5 7.5 12 6a3.5 3.5 0 0 1 5 5l-1.5 1.5" />
    <path d="M13.5 16.5 12 18a3.5 3.5 0 0 1-5-5l1.5-1.5" />
  </svg>
);
export const IconOracao = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3c1.8 2.2 2.8 4 2.8 5.8a2.8 2.8 0 1 1-5.6 0C9.2 7 10.2 5.2 12 3z" />
    <path d="M6 21c0-3.5 2.7-5 6-5s6 1.5 6 5" />
  </svg>
);
export const IconFechar = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconCheck = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", ...p })}><path d="M5 13l4 4L19 7" /></svg>
);
export const IconOlho = (p: IconProps) => (
  <svg {...base({ strokeLinecap: "round", strokeLinejoin: "round", ...p })}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconOlhoFechado = (p: IconProps) => (
  <svg {...base({ strokeLinecap: "round", strokeLinejoin: "round", ...p })}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.9 17.9 0 0 1-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
