'use client';

import Link from 'next/link';
import { useBolaoCtx } from './BolaoProvider';

export default function RightRail() {
  const { state } = useBolaoCtx();
  if (!state) return <aside className="rail" />;

  const meId = state.me?.id;
  const myIndex = meId ? state.leaderboard.findIndex((p) => p.id === meId) : -1;
  const me = myIndex >= 0 ? state.leaderboard[myIndex] : null;
  const leader = state.leaderboard[0];
  const gap = me && leader ? leader.total - me.total : 0;
  const s = state.scoring;
  const medal = (i: number) => (i === 0 ? '👑' : `${i + 1}`);

  return (
    <aside className="rail">
      {me && (
        <div className="rail-card">
          <div className="rail-title">Sua posição</div>
          <div className="rail-pos-row">
            <span className="rail-medal">{myIndex === 0 ? '🥇' : myIndex === 1 ? '🥈' : myIndex === 2 ? '🥉' : '🏅'}</span>
            <span className="rail-pos">{myIndex + 1}º</span>
          </div>
          <div className="rail-pts">{me.total} pontos</div>
          <div className="rail-sub">{myIndex === 0 ? 'você é o líder! 👑' : `${gap} ponto${gap === 1 ? '' : 's'} atrás do líder`}</div>
          <Link href="/classificacao" className="rail-btn">Ver classificação completa</Link>
        </div>
      )}

      <div className="rail-card">
        <div className="rail-title">Top 5 participantes</div>
        {state.leaderboard.slice(0, 5).map((p, i) => (
          <Link key={p.id} href={`/chaveamento?p=${p.id}`} className={`rail-row ${p.id === meId ? 'me' : ''}`}>
            <span className="rail-row-pos">{medal(i)}</span>
            <span className="rail-row-name">{p.name}</span>
            <span className="rail-row-pts">{p.total} pts</span>
          </Link>
        ))}
        {state.leaderboard.length === 0 && <div className="rail-sub">Ninguém entrou ainda.</div>}
        <Link href="/participantes" className="rail-btn">Ver todos os bolões</Link>
      </div>

      <div className="rail-card">
        <div className="rail-title">Tabela de pontos</div>
        <div className="rail-line"><span>🎯 Cravou o placar</span><b>{s.exact} pts</b></div>
        <div className="rail-line"><span>✅ Vencedor + saldo</span><b>{s.diff} pts</b></div>
        <div className="rail-line"><span>➖ Só quem passou</span><b>{s.winner} pts</b></div>
        <div className="rail-line"><span>Oitavas ×{s.multipliers.R16} · Quartas ×{s.multipliers.QF} · Semi ×{s.multipliers.SF}</span></div>
        <div className="rail-line"><span>3º lugar ×{s.multipliers.TP} · Final ×{s.multipliers.F}</span></div>
        <div className="rail-line"><span>🥈 Semifinalista {s.bonus.semifinalist} · 🎖️ Finalista {s.bonus.finalist}</span></div>
        <div className="rail-line"><span>🥉 3º lugar {s.bonus.third} · 🏆 Campeão {s.bonus.champion}</span></div>
        {(s.bonus.thirdMatch ?? 0) > 0 && (
          <div className="rail-line"><span>🎗️ Time na disputa de 3º {s.bonus.thirdMatch} cada</span></div>
        )}
        <Link href="/classificacao" className="rail-btn">Ver regras completas</Link>
      </div>
    </aside>
  );
}
