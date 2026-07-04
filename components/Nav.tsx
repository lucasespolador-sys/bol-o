'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyName } from './api';

const LINKS = [
  { href: '/', label: 'Classificação' },
  { href: '/palpites', label: 'Meus Palpites' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/central', label: 'Central' },
];

export default function Nav() {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(getMyName());
  }, [pathname]);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-title">⚽ Bolão da Copa 2026</Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`nav-link ${pathname === l.href ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
        {name && <span className="nav-user">👤 {name}</span>}
      </div>
    </nav>
  );
}
