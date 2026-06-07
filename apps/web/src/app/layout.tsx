import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';


import { RootErrorBoundary } from '@/components/error-boundary/root-error-boundary';
import { AppProviders } from '@/components/providers/app-providers';
import { Toaster } from '@/lib/toast';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const themeInitScript = `(function(){try{var t=localStorage.getItem('loomis-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased`}
      >
        <script
          id="loomis-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <RootErrorBoundary>
          <AppProviders>{children}</AppProviders>
          <Toaster />
        </RootErrorBoundary>
      </body>
    </html>
  );
}
