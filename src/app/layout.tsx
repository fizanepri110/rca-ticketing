import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RCA Ticketing — Billetterie Digitale",
  description: "Achetez vos billets en ligne avec Orange Money ou Moov Money",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
