'use client';

import Link from 'next/link';
import { useBolao } from '@/components/useBolao';
import { PHASE_LABEL } from '@/lib/types';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function RankingPage() {
  const { state, error, loading } = useBolao();

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  const liveCount = Object.values(state.matches).filter((m) => m?.status === 'LIVE').length;
  const meId = state.me?.id;
  const s = state.scoring;

  return (
    <>
      <h1>🏆 Classificação</h1>
      <p className="subtitle">
        {liveCount > 0 && <span className="badge live">● {liveCount} jogo{liveCount > 1 ? 's' : ''} ao vivo</span>}{' '}
        Atualiza sozinha a cada minuto.
        {state.lastSync && <> Resultados sincronizados às {fmtDate(state.lastSync)}.</>}
      </p>

      {!state.locked && (
        <div className="msg info">
          📝 Palpites abertos{state.lockAt ? <> até <b>{fmtDate(state.lockAt)}</b></> : null}!{' '}
          <Link href="/palpites">Preencha o seu quadro aqui</Link>. A pontuação começa a contar quando o mata-mata começar.
        </div>
      )}

      {state.leaderboard.length === 0 ? (
        <div className="card">
          Ninguém entrou ainda. Seja o primeiro: <Link href="/palpites">cadastre-se e faça seus palpites</Link>!
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Participante</th>
                <th className="num">Jogos</th>
                <th className="num">Bônus</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {state.leaderboard.map((p, i) => (
                <tr key={p.id} className={p.id === meId ? 'rank-row-me' : ''}>
                  <td className="rank-pos">{i === 0 && p.total > 0 ? '🥇' : i === 1 && p.total > 0 ? '🥈' : i === 2 && p.total > 0 ? '🥉' : i + 1}</td>
                  <td>
                    {p.name}
                    {!p.hasPicks && <span className="chip" style={{ marginLeft: 6 }}>sem palpites</span>}
                    {p.exactCount > 0 && <span className="chip hit-exact" style={{ marginLeft: 6 }}>🎯 {p.exactCount}</span>}
                  </td>
                  <td className="num">{p.matchPoints}</td>
                  <td className="num">{p.bonusPoints}</td>
                  <td className="num rank-total">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Como pontua</h2>
      <div className="grid-2">
        <div className="card">
          <b>Em cada jogo</b>
          <table className="rules-table">
            <tbody>
              <tr><td>🎯 Cravou o placar</td><td>{s.exact}</td></tr>
              <tr><td>✅ Vencedor + saldo de gols</td><td>{s.diff}</td></tr>
              <tr><td>➖ Só quem passou</td><td>{s.winner}</td></tr>
            </tbody>
          </table>
          <br />
          <b>Peso por fase (multiplica)</b>
          <table className="rules-table">
            <tbody>
              {(['R16', 'QF', 'SF', 'TP', 'F'] as const).map((ph) => (
                <tr key={ph}><td>{PHASE_LABEL[ph]}</td><td>×{s.multipliers[ph]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <b>Bônus de chaveamento</b>
          <table className="rules-table">
            <tbody>
              <tr><td>🥈 Cada semifinalista certo</td><td>{s.bonus.semifinalist}</td></tr>
              <tr><td>🎖️ Cada finalista certo</td><td>{s.bonus.finalist}</td></tr>
              <tr><td>🥉 Acertar o 3º colocado</td><td>{s.bonus.third}</td></tr>
              <tr><td>🏆 Acertar o campeão</td><td>{s.bonus.champion}</td></tr>
            </tbody>
          </table>
          <p className="subtitle" style={{ marginTop: 10 }}>
            ⚡ <b>Palpite jogo a jogo:</b> cada jogo trava no seu próprio horário. Você pode ajustar
            o placar de qualquer jogo que ainda não começou — mesmo que seu quadro tenha quebrado
            antes. Sem ajuste, vale o palpite do quadro (das quartas em diante, só se você tinha
            previsto aquele confronto). Os bônus valem sempre pelo quadro fixo. Cravar o placar da
            final vale {s.exact * s.multipliers.F} pontos!
          </p>
        </div>
      </div>
    </>
  );
}
