import type { Metadata } from 'next';
import { Sora, Geist_Mono } from 'next/font/google';
import './globals.css';

const sora = Sora({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'cetera | Local-First Document Intelligence',
  description: 'Ultra-private, locally hosted Retrieval-Augmented Generation (RAG) agent.',
  icons: {
    icon: '/cetera-icon-transparent.png',
    shortcut: '/cetera-icon-transparent.png',
    apple: '/cetera-icon-transparent.png',
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#060607] text-[#FEFDFF] font-sans selection:bg-[#614DFF]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

