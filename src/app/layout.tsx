import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatFlow - Multi-channel Chatbot Platform",
  description: "Plataforma de chatbots multi-canal con constructor visual de flujos, IA GLM integrada, y soporte para WhatsApp, Messenger, Instagram y Telegram.",
  keywords: ["chatbot", "flow builder", "WhatsApp", "Messenger", "Instagram", "Telegram", "GLM", "IA", "Next.js"],
  authors: [{ name: "ChatFlow" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ChatFlow - Multi-channel Chatbot Platform",
    description: "Constructor visual de flujos con IA GLM y multi-canal",
    siteName: "ChatFlow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatFlow",
    description: "Constructor visual de flujos con IA GLM y multi-canal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
