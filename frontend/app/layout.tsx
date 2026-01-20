import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CX Nexus",
  description: "Google 리뷰 기반 고객 경험(CX) 분석 플랫폼",
  icons: {
    icon: "/favicon_logo.png",          // ✅ 기본 파비콘
    shortcut: "/favicon_logo.png",      // ✅ 브라우저 단축 아이콘
    apple: "/favicon_logo.png",         // ✅ Apple Touch Icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}