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
  const [picks, setPicks] = useState<Picks>({});
  const [loadedPicks, setLoadedPicks] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLogged(!!getToken()); }, []);

  // Carrega os palpites salvos quando o estado chegar
  useEffect(() => {
    if (state?.me && !loadedPicks) {
      setPicks(state.me.picks ?? {});
      setLoadedPicks(true);
    }
  }, [state, loadedPicks]);

  const matches = state?.matches ?? {};
  const predTeams = useMemo(() => derivePredictedTeams(picks, matches), [picks, matches]);

  if (loading) return <p className="subtitle">Carregando…</p>;
  if (error) return <div className="msg err">{error}</div>;
  if (!state) return null;

  if (!logged) {
    return (
      <>
        <h1>📝 Meus Palpites</h1>
        <LoginBox onLogin={() => { setLogged(true); setLoadedPicks(false); refresh(); }} />
      </>
    );
  }

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
      <h1>📝 Meus Palpites</h1>
      <p className="subtitle">
        Olá, <b>{state.me?.name}</b>! Preencha o placar de cada jogo. Em caso de empate, escolha quem
        passa nos pênaltis — o vencedor avança automaticamente no seu quadro.{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); clearSession(); setLogged(false); setPicks({}); }}>Sair</a>
      </p>

      {state.locked && (
        <div className="msg info">🔒 Os palpites estão fechados — o mata-mata começou! Seu quadro está registrado abaixo.</div>
      )}
      {!r16Ready && (
        <div className="msg info">⏳ Os confrontos das oitavas ainda não foram definidos. Volte em breve!</div>
      )}

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
