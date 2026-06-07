import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "服务透明化平台",
  description: "维修服务进度查询",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
