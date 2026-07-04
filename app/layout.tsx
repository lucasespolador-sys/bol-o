import type { Metadata, Viewport } from 'next';
import './globals.css';
import BolaoProvider from '@/components/BolaoProvider';

export const metadata: Metadata = {
  title: 'Bolão da Copa 2026',
  description: 'Bolão da família — Copa do Mundo 2026. Placar, saldo e vencedor, com atualização automática dos resultados.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>',
  },
};

export const viewport: Viewport = {
  themeColor: '#06110b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <BolaoProvider>{children}</BolaoProvider>
      </body>
    </html>
  );
}
