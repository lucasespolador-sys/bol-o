'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, clearSession, getToken, saveSession } from '@/components/api';
import { useBolao } from '@/components/useBolao';
import TeamLabel from '@/components/TeamLabel';
import { derivePredictedTeams } from '@/lib/scoring';
import { teamNamePt } from '@/lib/teamNames';
import { FEEDERS, PHASE_LABEL, Phase, phaseOf, Pick, Picks, Slot, SLOTS } from '@/lib/types';

const SLOT_LABEL: Record<Slot, string> = {
  R16_1: 'Oitavas 1', R16_2: 'Oitavas 2', R16_3: 'Oitavas 3', R16_4: 'Oitavas 4',
  R16_5: 'Oitavas 5', R16_6: 'Oitavas 6', R16_7: 'Oitavas 7', R16_8: 'Oitavas 8',
  QF_1: 'Quartas 1', QF_2: 'Quartas 2', QF_3: 'Quartas 3', QF_4: 'Quartas 4',
  SF_1: 'Semifinal 1', SF_2: 'Semifinal 2', TP: '3º lugar', F: 'Final',
};

function feederLabel(slot: Slot, which: 0 | 1): string {
  const f = FEEDERS[slot];
  if (!f) return 'A definir';
  return slot === 'TP' ? `Perdedor ${SLOT_LABEL[f[which]]}` : `Vencedor ${SLOT_LABEL[f[which]]}`;
}

function LoginBox({ onLogin }: { onLogin: () => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (action: 'login' | 'register') => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ token: string; participant: { name: string } }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action, name, pin }),
      });
      saveSession(r.token, r.participant.name);
      onLogin();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Entre para palpitar</h2>
      <p className="subtitle">
        Primeira vez? Escolha um nome e um PIN (senha numérica) e toque em <b>Cadastrar</b>.
        Já tem cadastro? Use <b>Entrar</b>.
      </p>
      <div className="form-row">
        <div>
          <label>Seu nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Tia Lúcia" maxLength={30} />
        </div>
        <div>
          <label>PIN (mín. 4 dígitos)</label>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="****" maxLength={20} />
        </div>
      </div>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" disabled={busy} onClick={() => go('login')}>Entrar</button>
        <button className="btn secondary" disabled={busy} onClick={() => go('register')}>Cadastrar</button>
      </div>
    </div>
  );
}

export default function PalpitesPage() {
  const { state, error, loading, refresh } = useBolao();
  const [logged, setLogged] = useState(false);
  const [tab, setTab] = useState<'jogo' | 'quadro' | null>(null);

  useEffect(() => { setLogged(!!getToken()); }, []);
  useEffect(() => {
    if (state && tab === null) setTab(state.locked ? 'jogo' : 'quadro');
  }, [state, tab]);

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  if (!logged) {
    return (
      <>
        <h1>📝 Meus Palpites</h1>
        <LoginBox onLogin={() => { setLogged(true); refresh(); }} />
      </>
    );
  }

  return (
    <>
      <h1>📝 Meus Palpites</h1>
      <p className="subtitle">
        Olá, <b>{state.me?.name}</b>!{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); clearSession(); setLogged(false); }}>Sair</a>
      </p>
      <div className="tabs">
        <button className={tab === 'jogo' ? 'active' : ''} onClick={() => setTab('jogo')}>⚡ Jogo a jogo</button>
        <button className={tab === 'quadro' ? 'active' : ''} onClick={() => setTab('quadro')}>🔒 Meu quadro</button>
      </div>
      {tab === 'jogo' ? <LiveEditor state={state} refresh={refresh} /> : <BracketEditor state={state} refresh={refresh} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Palpites jogo a jogo: cada jogo trava no SEU horário
// ---------------------------------------------------------------------------

function LiveEditor({ state, refresh }: { state: any; refresh: () => void }) {
  const [live, setLive] = useState<Picks>({});
  const [edited, setEdited] = useState<Set<Slot>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state?.me && !loaded) {
      setLive(state.me.livePicks ?? {});
      setLoaded(true);
    }
  }, [state, loaded]);

  const matches = state.matches ?? {};
  const quadro: Picks = state.me?.picks ?? {};
  const predTeams = useMemo(() => derivePredictedTeams(quadro, matches), [quadro, matches]);

  // Palpite herdado do quadro, na orientação do jogo real (se previu o confronto)
  const quadroDefault = (slot: Slot): Pick | null => {
    const p = quadro[slot];
    const m = matches[slot];
    if (!p || !m?.home_name || !m?.away_name) return null;
    if (phaseOf(slot) === 'R16') return p;
    const ph = predTeams[slot]?.home?.name;
    const pa = predTeams[slot]?.away?.name;
    if (ph === m.home_name && pa === m.away_name) return p;
    if (ph === m.away_name && pa === m.home_name) {
      return { home_score: p.away_score, away_score: p.home_score, winner: p.winner === 'HOME' ? 'AWAY' : p.winner === 'AWAY' ? 'HOME' : null };
    }
    return null; // confronto diferente do previsto
  };

  const isOpen = (slot: Slot): boolean => {
    const m = matches[slot];
    return !!m && m.status === 'SCHEDULED' && !!m.home_name && !!m.away_name
      && !!m.kickoff && new Date(m.kickoff).getTime() > Date.now();
  };

  const setPick = (slot: Slot, patch: Partial<Pick>) => {
    setLive((prev) => {
      const cur = prev[slot] ?? quadroDefault(slot) ?? { home_score: 0, away_score: 0, winner: null };
      const next: Pick = { ...cur, ...patch };
      if (next.home_score !== next.away_score) next.winner = null;
      return { ...prev, [slot]: next };
    });
    setEdited((prev) => new Set(prev).add(slot));
  };

  const revert = async (slot: Slot) => {
    try {
      await api('/api/live', { method: 'PUT', body: JSON.stringify({ picks: { [slot]: null } }) });
      setLive((prev) => { const n = { ...prev }; delete n[slot]; return n; });
      setEdited((prev) => { const n = new Set(prev); n.delete(slot); return n; });
      setMsg({ kind: 'ok', text: `${SLOT_LABEL[slot]}: voltou a valer o palpite do quadro.` });
      refresh();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    }
  };

  const save = async () => {
    if (edited.size === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, Pick> = {};
      for (const slot of edited) if (live[slot]) payload[slot] = live[slot]!;
      const r = await api<{ saved: number; locked: string[] }>('/api/live', {
        method: 'PUT', body: JSON.stringify({ picks: payload }),
      });
      const lockedNote = r.locked?.length ? ` (${r.locked.length} jogo(s) já tinham começado e não mudaram)` : '';
      setMsg({ kind: 'ok', text: `Ajustes salvos: ${r.saved} jogo(s)${lockedNote}. 🍀` });
      setEdited(new Set());
      refresh();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const anyDefined = SLOTS.some((s) => matches[s]?.home_name && matches[s]?.away_name);

  return (
    <>
      <div className="msg info">
        ⚡ Aqui cada jogo trava <b>no seu próprio horário</b>. Enquanto o jogo não começou, você pode
        ajustar o placar — mesmo que seu quadro tenha quebrado nas fases anteriores. Sem ajuste,
        vale o palpite do seu quadro. Os bônus (semifinalistas, finalistas, 3º e campeão) continuam
        valendo pelo quadro fixo.
      </div>
      {!anyDefined && <div className="msg info">⏳ Nenhum confronto definido ainda.</div>}
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}

      {(['R16', 'QF', 'SF', 'TP', 'F'] as Phase[]).map((phase) => {
        const slots = SLOTS.filter((s) => phaseOf(s) === phase && matches[s]?.home_name && matches[s]?.away_name);
        if (!slots.length) return null;
        return (
          <section key={phase}>
            <div className="phase-title">
              <h2>{PHASE_LABEL[phase]}</h2>
              <span className="mult">pontos ×{state.scoring.multipliers[phase]}</span>
            </div>
            {slots.map((slot) => {
              const m = matches[slot]!;
              const open = isOpen(slot);
              const hasLive = !!live[slot];
              const shown = live[slot] ?? quadroDefault(slot);
              const tie = shown && shown.home_score === shown.away_score;
              const started = m.status !== 'SCHEDULED';
              return (
                <div className="pick-card" key={slot}>
                  <div className="match-head">
                    <span>{SLOT_LABEL[slot]}{m.kickoff_label ? ` · ${m.kickoff_label}` : ''}</span>
                    <span>
                      {started
                        ? (m.status === 'LIVE' ? '🔴 em andamento' : `encerrado ${m.home_score}×${m.away_score}`)
                        : !open ? '🔒 travado'
                        : hasLive ? '⚡ ajustado'
                        : shown ? 'usando o quadro' : 'sem palpite'}
                    </span>
                  </div>
                  <div className="pick-row">
                    <TeamLabel team={{ name: m.home_name!, crest: m.home_crest }} side="home" />
                    <input
                      className="goal" type="number" min={0} max={30} inputMode="numeric"
                      disabled={!open}
                      value={shown?.home_score ?? ''}
                      onChange={(e) => setPick(slot, { home_score: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                    />
                    <span>×</span>
                    <input
                      className="goal" type="number" min={0} max={30} inputMode="numeric"
                      disabled={!open}
                      value={shown?.away_score ?? ''}
                      onChange={(e) => setPick(slot, { away_score: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                    />
                    <TeamLabel team={{ name: m.away_name!, crest: m.away_crest }} side="away" />
                  </div>
                  {open && tie && (
                    <div className="tie-picker">
                      Empate — quem passa nos pênaltis?
                      <br />
                      <button className={shown?.winner === 'HOME' ? 'selected' : ''} onClick={() => setPick(slot, { winner: 'HOME' })}>
                        {teamNamePt(m.home_name!)}
                      </button>
                      <button className={shown?.winner === 'AWAY' ? 'selected' : ''} onClick={() => setPick(slot, { winner: 'AWAY' })}>
                        {teamNamePt(m.away_name!)}
                      </button>
                    </div>
                  )}
                  {open && hasLive && (
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <button className="btn small secondary" onClick={() => revert(slot)}>↩ Voltar ao palpite do quadro</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="save-bar">
        <button className="btn" onClick={save} disabled={saving || edited.size === 0}>
          {saving ? 'Salvando…' : `💾 Salvar ajustes${edited.size ? ` (${edited.size})` : ''}`}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Quadro fixo (fecha no primeiro jogo das oitavas)
// ---------------------------------------------------------------------------

function BracketEditor({ state, refresh }: { state: any; refresh: () => void }) {
  const [picks, setPicks] = useState<Picks>({});
  const [loadedPicks, setLoadedPicks] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state?.me && !loadedPicks) {
      setPicks(state.me.picks ?? {});
      setLoadedPicks(true);
    }
  }, [state, loadedPicks]);

  const matches = state?.matches ?? {};
  const predTeams = useMemo(() => derivePredictedTeams(picks, matches), [picks, matches]);

  const setPick = (slot: Slot, patch: Partial<Pick>) => {
    setPicks((prev) => {
      const cur = prev[slot] ?? { home_score: 0, away_score: 0, winner: null };
      const next: Pick = { ...cur, ...patch };
      if (next.home_score !== next.away_score) next.winner = null;
      return { ...prev, [slot]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api<{ saved: number }>('/api/predictions', {
        method: 'PUT',
        body: JSON.stringify({ picks }),
      });
      setMsg({ kind: 'ok', text: `Quadro salvo! ${r.saved} palpite(s) registrados. Boa sorte! 🍀` });
      refresh();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const r16Ready = (['R16_1','R16_2','R16_3','R16_4','R16_5','R16_6','R16_7','R16_8'] as Slot[])
    .some((s) => matches[s]?.home_name);

  const pending = SLOTS.filter((s) => {
    const p = picks[s];
    return !p || (p.home_score === p.away_score && !p.winner);
  }).length;

  return (
    <>
      {state.locked ? (
        <div className="msg info">
          🔒 O quadro fechou quando o mata-mata começou — ele continua valendo os bônus de
          chaveamento e como palpite padrão. Para ajustar os próximos jogos, use a aba <b>⚡ Jogo a jogo</b>.
        </div>
      ) : (
        <div className="msg info">
          Preencha o placar de cada jogo — em caso de empate, escolha quem passa nos pênaltis.
          O quadro fecha no primeiro jogo das oitavas e vale os bônus de chaveamento.
        </div>
      )}
      {!r16Ready && <div className="msg info">⏳ Os confrontos das oitavas ainda não foram definidos. Volte em breve!</div>}

      {(['R16', 'QF', 'SF', 'TP', 'F'] as Phase[]).map((phase) => (
        <section key={phase}>
          <div className="phase-title">
            <h2>{PHASE_LABEL[phase]}</h2>
            <span className="mult">pontos ×{state.scoring.multipliers[phase]}</span>
          </div>
          {SLOTS.filter((s) => phaseOf(s) === phase).map((slot) => {
            const t = predTeams[slot];
            const p = picks[slot];
            const m = matches[slot];
            const tie = p && p.home_score === p.away_score;
            return (
              <div className="pick-card" key={slot}>
                <div className="match-head">
                  <span>{SLOT_LABEL[slot]}</span>
                  {phase === 'R16' && m?.kickoff_label && <span>{m.kickoff_label}</span>}
                </div>
                <div className="pick-row">
                  <TeamLabel team={t.home} placeholder={feederLabel(slot, 0)} side="home" />
                  <input
                    className="goal" type="number" min={0} max={30} inputMode="numeric"
                    disabled={state.locked}
                    value={p?.home_score ?? ''}
                    onChange={(e) => setPick(slot, { home_score: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                  />
                  <span>×</span>
                  <input
                    className="goal" type="number" min={0} max={30} inputMode="numeric"
                    disabled={state.locked}
                    value={p?.away_score ?? ''}
                    onChange={(e) => setPick(slot, { away_score: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                  />
                  <TeamLabel team={t.away} placeholder={feederLabel(slot, 1)} side="away" />
                </div>
                {tie && (
                  <div className="tie-picker">
                    Empate — quem passa nos pênaltis?
                    <br />
                    <button
                      className={p?.winner === 'HOME' ? 'selected' : ''}
                      disabled={state.locked}
                      onClick={() => setPick(slot, { winner: 'HOME' })}
                    >
                      {t.home?.name ? teamNamePt(t.home.name) : 'Time da esquerda'}
                    </button>
                    <button
                      className={p?.winner === 'AWAY' ? 'selected' : ''}
                      disabled={state.locked}
                      onClick={() => setPick(slot, { winner: 'AWAY' })}
                    >
                      {t.away?.name ? teamNamePt(t.away.name) : 'Time da direita'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {!state.locked && (
        <div className="save-bar">
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : '💾 Salvar meu quadro'}
          </button>
          {pending > 0 && <span className="subtitle" style={{ margin: 0 }}>{pending} jogo(s) sem palpite completo</span>}
        </div>
      )}
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
    </>
  );
}
