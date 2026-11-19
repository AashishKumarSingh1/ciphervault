import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CipherVault — AES-256 Secure Database Management System",
  description:
    "Lightweight, professional secure database management application protecting sensitive user records with AES-256-GCM before persistence in SQLite.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-[#0B1120] text-[#F1F5F9]">
        {children}
      </body>
    </html>
  );
}
