import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIHF 2026 Tipovacka",
  description: "Tipovaci soutez pro MS v hokeji 2026"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
