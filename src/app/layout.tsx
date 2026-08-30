import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  applicationName: "Glimmer Journal",
  appleWebApp: {
    capable: true,
    title: "Glimmer Journal",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Glimmer Journal",
    description: "Track your micro-moments of safety. Notice, name, and nurture glimmers every day.",
    type: "website",
    siteName: "Glimmer Journal",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glimmer Journal",
    description: "Track your micro-moments of safety. Notice, name, and nurture glimmers every day.",
  },
};

export const viewport: Viewport = {
  themeColor: "#5A8A4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
