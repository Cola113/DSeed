import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '可乐的小站',
  description: 'AI 生图 / 改图',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  );
}
