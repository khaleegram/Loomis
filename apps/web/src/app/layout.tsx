import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import { ClientRoot } from '@/components/providers/client-root';
import { themeInitScript } from '@/lib/theme/theme-script';

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

const chunkRecoveryScript = `(function(){try{var k='loomis-chunk-reload';window.addEventListener('error',function(e){var m=(e&&e.message)||'';if(m.indexOf('Loading chunk')!==-1&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');window.location.reload();}});window.addEventListener('load',function(){sessionStorage.removeItem(k);});}catch(e){}})();`;

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
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-background text-foreground`}
      >
        <script
          id="loomis-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <script
          id="loomis-chunk-recovery"
          dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }}
        />
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
