import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Despertar",
    short_name: "Despertar",
    description: "Onde quem está despertando se encontra.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#B8663F",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
