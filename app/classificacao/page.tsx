'use client';

import Link from 'next/link';
import { useBolaoCtx } from '@/components/BolaoProvider';
import { PHASE_LABEL } from '@/lib/types';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ClassificacaoPage() {
  const { state, error, loading } = useBolaoCtx();

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  const meId = state.me?.id;
  const s = state.scoring;
  const medalFor = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉');

  return (
    <>
      <h1>📊 Classificação</h1>
      <p className="subtitle">
        Atualiza sozinha a cada minuto.
        {state.lastSync && <> Resultados sincronizados às {fmtDate(state.lastSync)}.</>}
        {' '}Toque num participante para ver o bolão dele.
      </p>

      {state.leaderboard.length === 0 ? (
        <div className="card">
          Ninguém entrou ainda. Seja o primeiro: <Link href="/palpites">cadastre-se e faça seus palpites</Link>!
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: '6px 12px' }}>
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
              {state.leaderboard.map((p, i) => {
                const podium = p.total > 0 && i < 3 ? `podium-${i + 1}` : '';
                return (
                  <tr key={p.id} className={`${podium} ${p.id === meId ? 'rank-row-me' : ''}`}>
                    <td className="rank-pos">{p.total > 0 && i < 3 ? medalFor(i) : `${i + 1}º`}</td>
                    <td>
                      <Link href={`/chaveamento?p=${p.id}`} className="rank-link">{p.name}</Link>
                      {!p.hasPicks && <span className="chip" style={{ marginLeft: 6 }}>sem palpites</span>}
                      {p.exactCount > 0 && <span className="chip hit-exact" style={{ marginLeft: 6 }}>🎯 {p.exactCount}</span>}
                    </td>
                    <td className="num">{p.matchPoints}</td>
                    <td className="num">{p.bonusPoints}</td>
                    <td className="num rank-total">{p.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2>📖 Regras do bolão</h2>
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
              {(s.bonus.thirdMatch ?? 0) > 0 && (
                <tr><td>🎗️ Cada time certo na disputa de 3º</td><td>{s.bonus.thirdMatch}</td></tr>
              )}
            </tbody>
          </table>
          <p className="subtitle" style={{ marginTop: 10 }}>
            ⚡ <b>Segunda chance (jogo a jogo):</b> das quartas em diante, se o confronto real for
            diferente do que você previu no quadro, você pode dar um palpite novo naquele jogo até
            o horário dele. Quem previu o confronto mantém o palpite do quadro. Nas oitavas vale
            sempre o quadro. Bônus valem sempre pelo quadro fixo. O placar considera a prorrogação;
            pênaltis só decidem quem passa. Cravar a final vale {s.exact * s.multipliers.F} pontos!
          </p>
        </div>
      </div>
    </>
  );
}
