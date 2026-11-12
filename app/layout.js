import "./globals.css";
export const metadata = {
  title: "Aidat Takip - Otomatik WhatsApp Aidat Hatırlatma",
  description: "Spor okulları ve kurslar için aidat takibi, yoklama ve WhatsApp mesaj hazırlama",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Aidat Takip", statusBarStyle: "default" },
};
export const viewport = { themeColor: "#111111" };
export default function Layout({ children }) {
  return (<html lang="tr"><body>{children}</body></html>);
}
