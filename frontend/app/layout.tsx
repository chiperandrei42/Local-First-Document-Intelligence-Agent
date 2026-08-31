import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Local-First Document Intelligence Agent | 100% Air-Gapped RAG',
  description: 'Ultra-private, locally hosted Retrieval-Augmented Generation (RAG) agent running Ollama, ChromaDB, and Next.js.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#030704] text-[#e2f5ea] font-sans selection:bg-emerald-500/30 selection:text-[#00ff88]">
        {children}
      </body>
    </html>
  );
}
