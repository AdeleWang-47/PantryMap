import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PantryLink",
  description: "Find community fridges and micro-pantries near you",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* h-screen + flex-col so child pages can use flex:1 to fill remaining height */}
        <div className="flex h-screen flex-col bg-white font-sans text-zinc-900" style={{height: "100dvh", overflow: "hidden"}}>
          <Header />
          {/* overflow-y:auto lets regular pages (About, Donation Guide) scroll.
              The map page uses its own overflow:clip on .map-page-layout. */}
          <div className="flex flex-1 flex-col" style={{minHeight: 0, overflowY: "auto"}}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
