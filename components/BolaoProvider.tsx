'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useBolao } from './useBolao';
import { BolaoState } from './api';
import Sidebar from './Sidebar';
import RightRail from './RightRail';

interface Ctx {
  state: BolaoState | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

const BolaoCtx = createContext<Ctx>({ state: null, error: null, loading: true, refresh: () => {} });

export function useBolaoCtx(): Ctx {
  return useContext(BolaoCtx);
}

export default function BolaoProvider({ children }: { children: React.ReactNode }) {
  const ctx = useBolao();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const showRail = pathname !== '/central';

  return (
    <BolaoCtx.Provider value={ctx}>
      <div className="shell">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
          <div className="topbar-brand">
            <span className="brand-trophy">🏆</span>
            <span>
              <span className="brand-top">Bolão da Copa do Mundo</span>
              <span className="brand-main">2026 <span className="stars">★★★★</span></span>
            </span>
          </div>
        </header>
        <div className={`shell-body ${showRail ? 'with-rail' : ''}`}>
          <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
          {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
          <main className="main">{children}</main>
          {showRail && <RightRail />}
        </div>
      </div>
    </BolaoCtx.Provider>
  );
}
