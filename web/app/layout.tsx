import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Painel de Transparência",
  description: "Contratações públicas do PNCP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body>
        <nav>
          <span className="brand">Painel de Transparência</span>
          <a href="/">Contratações</a>
          <a href="/resumo">Resumo</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
