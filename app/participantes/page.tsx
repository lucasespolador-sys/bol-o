'use client';

import Link from 'next/link';
import { useBolaoCtx } from '@/components/BolaoProvider';

export default function ParticipantesPage() {
  const { state, error, loading } = useBolaoCtx();

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  return (
    <>
      <h1>👥 Participantes</h1>
      <p className="subtitle">
        {state.leaderboard.length} pessoa{state.leaderboard.length === 1 ? '' : 's'} no bolão.
        Toque em alguém para ver o chaveamento com os palpites dele (somente leitura
        {state.locked ? '' : ' — visível quando o mata-mata começar'}).
      </p>
      <div className="participants-grid">
        {state.leaderboard.map((p, i) => (
          <Link key={p.id} href={`/chaveamento?p=${p.id}`} className="participant-card">
            <span className="p-medal">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
            <span className="p-name">{p.name}{p.id === state.me?.id ? ' (você)' : ''}</span>
            <span className="p-pts">{p.total} pts</span>
            <span className="p-sub">{i + 1}º lugar{p.exactCount > 0 ? ` · 🎯 ${p.exactCount} cravada${p.exactCount > 1 ? 's' : ''}` : ''}{!p.hasPicks ? ' · sem palpites' : ''}</span>
          </Link>
        ))}
      </div>
      {state.leaderboard.length === 0 && (
        <div className="card">Ninguém entrou ainda. <Link href="/palpites">Seja o primeiro!</Link></div>
      )}
    </>
  );
}
