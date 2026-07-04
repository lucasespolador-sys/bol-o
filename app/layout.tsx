import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Bolão da Copa 2026',
  description: 'Bolão da família — Copa do Mundo 2026. Placar, saldo e vencedor, com atualização automática dos resultados.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b3d2e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Nav />
        <main className="container">{children}</main>
        <footer className="footer">
          Bolão da Família · Copa do Mundo 2026 · dados via{' '}
          <a href="https://worldcup26.ir" target="_blank" rel="noreferrer">World Cup 2026 API</a>
        </footer>
      </body>
    </html>
  );
}
