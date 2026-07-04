'use client';

import Link from 'next/link';
import { useBolaoCtx } from '@/components/BolaoProvider';
import Bracket from '@/components/Bracket';
import { PHASE_LABEL, Phase, phaseOf, SLOTS } from '@/lib/types';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function HomePage() {
  const { state, error, loading } = useBolaoCtx();

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  // Fase atual = primeira fase com jogo não encerrado
  let currentPhase: Phase = 'R16';
  for (const ph of ['R16', 'QF', 'SF', 'TP', 'F'] as Phase[]) {
    const slots = SLOTS.filter((s) => phaseOf(s) === ph);
    if (slots.some((s) => state.matches[s]?.status !== 'FINISHED')) { currentPhase = ph; break; }
    currentPhase = 'F';
  }
  const liveCount = Object.values(state.matches).filter((m) => m?.status === 'LIVE').length;

  return (
    <>
      <div className="hero">
        <div className="hero-flex">
          <div>
            <div className="hero-top">Bem-vindo ao</div>
            <h1>Bolão da Copa 2026 🏆</h1>
            <p>Mata-mata em andamento! Faça seus palpites e dispute com a família.</p>
            <div className="chips">
              <span className="stat-chip">👥 <b>{state.leaderboard.length}</b><small>participantes</small></span>
              <span className="stat-chip">🗓️ <b>04/07 – 19/07</b><small>período</small></span>
              <span className="stat-chip">🛡️ <b>Família</b><small>tipo de bolão</small></span>
              {liveCount > 0 && <span className="stat-chip live-chip">🔴 <b>{liveCount}</b><small>ao vivo</small></span>}
            </div>
          </div>
          <div className="hero-trophy">🏆</div>
        </div>
      </div>

      <div className="section-bar">
        <span className="fase-chip">Fase atual: <b>{PHASE_LABEL[currentPhase]}</b></span>
        <div className="tabs inline">
          <Link href="/" className="tab-link active">Chaveamento</Link>
          <Link href="/jogos" className="tab-link">Jogos</Link>
          <Link href="/palpites" className="tab-link">Meus Palpites</Link>
        </div>
        {state.lastSync && <span className="updated-at">Atualizado: {fmtDate(state.lastSync)}</span>}
      </div>

      <Bracket />

      {!state.locked && (
        <Link href="/palpites" className="cta-banner">
          🏆 Faça seus palpites e mostre que você entende de futebol! ⚽
          <small>{state.lockAt ? `O quadro fecha em ${fmtDate(state.lockAt)}` : 'Quadro aberto!'} — depois dá para ajustar jogo a jogo</small>
        </Link>
      )}
      {state.locked && (
        <Link href="/palpites" className="cta-banner">
          ⚡ Acompanhe cada jogo e ajuste seus palpites! ⚽
          <small>Cada jogo trava no seu próprio horário — a Copa 2026 aguarda por você!</small>
        </Link>
      )}
    </>
  );
}
