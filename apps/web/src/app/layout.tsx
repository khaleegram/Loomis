import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import { ClientRoot } from '@/components/providers/client-root';

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

const themeInitScript = `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';localStorage.setItem('loomis-theme','light');}catch(e){}})();`;

/** Recover from stale dev chunks after a hot reload (common on WSL). */
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
    <html lang="en" suppressHydrationWarning className="light" style={{ colorScheme: 'light' }}>
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased`}
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
