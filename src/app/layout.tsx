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
  title: "Glimmer Journal",
  description: "Track your micro-moments of safety. A journaling app rooted in polyvagal theory to help you notice, name, and nurture glimmers — the tiny signals that tell your nervous system you're safe.",
  keywords: ["glimmer", "polyvagal", "nervous system", "journal", "safety", "wellbeing", "mental health", "deb dana"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Glimmer Journal",
    description: "Track your micro-moments of safety. Notice, name, and nurture glimmers every day.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glimmer Journal",
    description: "Track your micro-moments of safety. Notice, name, and nurture glimmers every day.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
