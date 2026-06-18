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
      <body className="min-h-full flex flex-col">
        {children}
        <footer style={{ textAlign: 'center', padding: '15px 0', fontSize: '14px', color: '#666' }}>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow" style={{ color: '#666' }}>
            吉ICP备2026005769号
          </a>
        </footer>
      </body>
    </html>
  );
}
