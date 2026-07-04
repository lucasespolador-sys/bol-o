'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyName } from './api';
import Trophy from './Trophy';

const MENU = [
  { href: '/', icon: '🏠', label: 'Início' },
  { href: '/chaveamento', icon: '🗂️', label: 'Chaveamento', badge: 'NOVO' },
  { href: '/jogos', icon: '⚽', label: 'Jogos' },
  { href: '/palpites', icon: '📝', label: 'Meus Palpites' },
  { href: '/classificacao', icon: '📊', label: 'Classificação' },
  { href: '/participantes', icon: '👥', label: 'Participantes' },
  { href: '/central', icon: '⚙️', label: 'Central' },
];

export default function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { setName(getMyName()); }, [pathname]);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Link href="/" className="side-brand" onClick={onNavigate}>
        <Trophy size={40} />
        <span>
          <span className="brand-top">Bolão da<br />Copa do Mundo</span>
          <span className="brand-main">2026 <span className="stars">★★★★</span></span>
        </span>
      </Link>
      <nav className="side-menu">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            onClick={onNavigate}
            className={`side-link ${pathname === m.href ? 'active' : ''}`}
          >
            <span className="side-icon">{m.icon}</span>
            {m.label}
            {m.badge && <span className="side-badge">{m.badge}</span>}
          </Link>
        ))}
      </nav>
      {name && <div className="side-user">👤 {name}</div>}
      <div className="side-promo">
        <div className="side-promo-title">🏆 A maior competição do mundo!</div>
        Que vença o melhor palpiteiro!
      </div>
    </aside>
  );
}
