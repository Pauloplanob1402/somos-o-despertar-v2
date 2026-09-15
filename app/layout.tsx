import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { PresenceProvider } from "@/context/PresenceContext";
import { MensagensProvider } from "@/context/MensagensContext";
import { NotificacoesProvider } from "@/context/NotificacoesContext";
import { Toast } from "@/components/Toast";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-texto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Despertar — Onde quem está despertando se encontra.",
  description:
    "Uma rede social para quem está em jornada de despertar espiritual encontrar outras pessoas na mesma caminhada.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Despertar",
  },
};

export const viewport: Viewport = {
  themeColor: "#B8663F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${cormorant.variable} ${inter.variable}`}>
        <AuthProvider>
          <AppProvider>
            <PresenceProvider>
              <MensagensProvider>
                <NotificacoesProvider>
                  {children}
                  <Toast />
                </NotificacoesProvider>
              </MensagensProvider>
            </PresenceProvider>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
