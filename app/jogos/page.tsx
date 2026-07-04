'use client';

import { useBolao } from '@/components/useBolao';
import TeamLabel from '@/components/TeamLabel';
import { teamNamePt } from '@/lib/teamNames';
import { PHASE_LABEL, Phase, phaseOf, Slot, SLOTS } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
  if (status === 'LIVE') return <span className="badge live">● AO VIVO</span>;
  if (status === 'FINISHED') return <span className="badge done">Encerrado</span>;
  return <span className="badge sched">Agendado</span>;
}

const KIND_CLASS: Record<string, string> = {
  exact: 'hit-exact',
  diff: 'hit-diff',
  winner: 'hit-winner',
};
const KIND_ICON: Record<string, string> = {
  exact: '🎯',
  diff: '✅',
  winner: '➖',
};

export default function JogosPage() {
  const { state, error, loading } = useBolao();

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  const matches = state.matches;
  const hasAny = Object.values(matches).some((m) => m?.home_name);

  return (
    <>
      <h1>⚽ Jogos</h1>
      <p className="subtitle">
        Resultados atualizados automaticamente.{' '}
        {state.locked
          ? 'Os palpites de todo mundo aparecem em cada jogo.'
          : 'Os palpites dos participantes ficam visíveis quando o mata-mata começar.'}
      </p>

      {!hasAny && <div className="msg info">⏳ Aguardando a definição dos confrontos das oitavas.</div>}

      {(['R16', 'QF', 'SF', 'TP', 'F'] as Phase[]).map((phase) => (
        <section key={phase}>
          <div className="phase-title">
            <h2>{PHASE_LABEL[phase]}</h2>
            <span className="mult">×{state.scoring.multipliers[phase]}</span>
          </div>
          {SLOTS.filter((s) => phaseOf(s) === phase).map((slot) => {
            const m = matches[slot];
            const started = m && m.status !== 'SCHEDULED' && m.home_score != null;
            return (
              <div className="match-card" key={slot}>
                <div className="match-head">
                  <span>{m?.kickoff_label ?? ''}</span>
                  <StatusBadge status={m?.status ?? 'SCHEDULED'} />
                </div>
                <div className="match-line">
                  <TeamLabel
                    team={m?.home_name ? { name: m.home_name, crest: m.home_crest } : null}
                    side="home"
                  />
                  <span className="score">
                    {started ? `${m!.home_score} × ${m!.away_score}` : '—'}
                    {m?.status === 'FINISHED' && m.home_score === m.away_score && m.winner && (
                      <span className="pen">
                        {teamNamePt(m.winner === 'HOME' ? m.home_name : m.away_name)} nos pênaltis
                      </span>
                    )}
                  </span>
                  <TeamLabel
                    team={m?.away_name ? { name: m.away_name, crest: m.away_crest } : null}
                    side="away"
                  />
                </div>

                {state.board && (
                  <div className="pick-chips">
                    {state.board.map((b) => {
                      const p = b.picks[slot];
                      if (!p) return <span className="chip" key={b.id}>{b.name}: —</span>;
                      const t = b.predTeams[slot];
                      const sc = b.slots[slot];
                      const kindClass = sc && sc.points > 0 ? KIND_CLASS[sc.kind] ?? '' : '';
                      const showTeams = phase !== 'R16' && t.home?.name && t.away?.name
                        ? ` (${teamNamePt(t.home.name)} × ${teamNamePt(t.away.name)})`
                        : '';
                      return (
                        <span className={`chip ${kindClass}`} key={b.id}>
                          {b.name}: <b>{p.home_score}×{p.away_score}</b>{showTeams}
                          {p.winner && p.home_score === p.away_score && t[p.winner === 'HOME' ? 'home' : 'away']?.name
                            ? ` (${teamNamePt(t[p.winner === 'HOME' ? 'home' : 'away']!.name)} passa)`
                            : ''}
                          {sc && sc.points > 0 && <> {KIND_ICON[sc.kind]} +{sc.points}</>}
                          {sc && sc.kind === 'not_counted' && ' (confronto diferente)'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
