import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grocery Budget ZA",
  description: "Personal grocery budget assistant for South Africa",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Budget ZA",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#07090f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={outfit.variable}>
      <body className={`${outfit.className} antialiased pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0`}>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-4 md:py-6">{children}</main>
      </body>
    </html>
  );
}
