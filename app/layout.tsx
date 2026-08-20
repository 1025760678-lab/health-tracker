import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Flow — 个人健康与健身记录",
  description: "在同一款精致的健康工具中记录饮水、力量训练、饮食与每日能量状态。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Flow — 个人健康与健身记录",
    description: "饮水、训练、饮食与能量状态，一处清晰掌握。",
    images: [{ url: "/og.png", width: 1728, height: 909, alt: "Flow 水蓝色液体圆环" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flow — 个人健康与健身记录",
    description: "饮水、训练、饮食与能量状态，一处清晰掌握。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
