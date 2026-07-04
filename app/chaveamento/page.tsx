'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBolaoCtx } from '@/components/BolaoProvider';
import Bracket from '@/components/Bracket';

function ChaveamentoInner() {
  const { state, error, loading } = useBolaoCtx();
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get('p');

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  const target = selected || state.me?.id || '';
  const targetName = state.leaderboard.find((p) => p.id === target)?.name
    ?? (target === state.me?.id ? state.me?.name : null);
  const isMe = !!state.me?.id && target === state.me.id;

  return (
    <>
      <h1>🗂️ Chaveamento</h1>
      <p className="subtitle">
        Veja o quadro de qualquer participante em cima dos resultados reais.
        {!isMe && targetName && <> Você está vendo o bolão de <b>{targetName}</b> (somente leitura).</>}
      </p>

      <div className="viewer-bar">
        <label style={{ margin: 0 }}>Vendo o bolão de:</label>
        <select
          value={target}
          onChange={(e) => router.replace(`/chaveamento?p=${e.target.value}`)}
        >
          {!state.me?.id && !selected && <option value="">— escolha —</option>}
          {state.leaderboard.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.id === state.me?.id ? ' (você)' : ''} — {p.total} pts
            </option>
          ))}
        </select>
      </div>

      <Bracket participantId={target || null} />
    </>
  );
}

export default function ChaveamentoPage() {
  return (
    <Suspense fallback={<p className="subtitle">Carregando…</p>}>
      <ChaveamentoInner />
    </Suspense>
  );
}
