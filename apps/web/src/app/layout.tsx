import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { RootErrorBoundary } from '@/components/error-boundary/root-error-boundary';
import { AppProviders } from '@/components/providers/app-providers';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Loomis',
  description: 'School management platform for Nigerian private schools',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <RootErrorBoundary>
          <AppProviders>{children}</AppProviders>
        </RootErrorBoundary>
      </body>
    </html>
  );
}
