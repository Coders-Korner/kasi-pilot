import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "TradePulse — Business in your pocket",
  description:
    "Record sales, track stock and build a bankable trading history from a simple chat. Built for South African spaza shops and township traders.",
  manifest: "/manifest.webmanifest",
  applicationName: "TradePulse",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TradePulse",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}