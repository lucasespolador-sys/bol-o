'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useBolao } from './useBolao';
import { BolaoState, getMyName } from './api';
import Sidebar from './Sidebar';
import RightRail from './RightRail';
import InviteButton from './InviteButton';
import Trophy from './Trophy';

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
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { setName(getMyName()); }, [pathname]);
  const showRail = pathname !== '/central';

  return (
    <BolaoCtx.Provider value={ctx}>
      <div className="shell">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
          <div className="topbar-brand">
            <Trophy size={26} />
            <span>
              <span className="brand-top">Bolão da Copa do Mundo</span>
              <span className="brand-main">2026 <span className="stars">★★★★</span></span>
            </span>
          </div>
          <div style={{ marginLeft: 'auto' }}><InviteButton /></div>
        </header>
        <div className={`shell-body ${showRail ? 'with-rail' : ''}`}>
          <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
          {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
          <main className="main">
            <div className="main-top">
              <InviteButton />
              {name && (
                <span className="user-chip">
                  <span className="user-avatar">{name.slice(0, 1).toUpperCase()}</span>
                  <span>
                    <b>{name}</b>
                    <small>Participante</small>
                  </span>
                </span>
              )}
            </div>
            {children}
          </main>
          {showRail && <RightRail />}
        </div>
      </div>
    </BolaoCtx.Provider>
  );
}
