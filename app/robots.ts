import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/termos", "/privacidade"],
        disallow: ["/inicio", "/mensagens", "/notificacoes", "/perfil", "/api/"],
      },
    ],
  };
}
