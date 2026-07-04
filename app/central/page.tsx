'use client';

import { useEffect, useState } from 'react';
import { api, clearAdminToken, getAdminToken, saveAdminToken } from '@/components/api';
import { useBolao } from '@/components/useBolao';
import { DEFAULT_SCORING, PHASE_LABEL, Phase, phaseOf, ScoringConfig, Slot, SLOTS } from '@/lib/types';

type Tab = 'pontuacao' | 'resultados' | 'participantes' | 'sync';

function useMsg() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const ok = (text: string) => setMsg({ kind: 'ok', text });
  const err = (text: string) => setMsg({ kind: 'err', text });
  return { msg, ok, err, clear: () => setMsg(null) };
}

export default function CentralPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState<Tab>('pontuacao');
  const { msg, ok, err, clear } = useMsg();

  useEffect(() => { setAuthed(!!getAdminToken()); }, []);

  const login = async () => {
    clear();
    try {
      const r = await api<{ token: string }>('/api/admin', {
        method: 'POST',
        body: JSON.stringify({ action: 'login', pin }),
      });
      saveAdminToken(r.token);
      setAuthed(true);
    } catch (e: any) {
      err(e.message);
    }
  };

  if (!authed) {
    return (
      <>
        <h1>🛠️ Central</h1>
        <div className="card">
          <p className="subtitle">Área do organizador do bolão. Digite a senha de administrador (variável <code>ADMIN_PIN</code> na Vercel).</p>
          <div className="form-row">
            <div>
              <label>Senha de administrador</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
            </div>
          </div>
          {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
          <button className="btn" onClick={login}>Entrar</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>🛠️ Central</h1>
      <p className="subtitle">
        Área do organizador.{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); clearAdminToken(); setAuthed(false); }}>Sair</a>
      </p>
      <div className="tabs">
        <button className={tab === 'pontuacao' ? 'active' : ''} onClick={() => setTab('pontuacao')}>Pontuação</button>
        <button className={tab === 'resultados' ? 'active' : ''} onClick={() => setTab('resultados')}>Resultados</button>
        <button className={tab === 'participantes' ? 'active' : ''} onClick={() => setTab('participantes')}>Participantes</button>
        <button className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>Sincronização</button>
      </div>
      {tab === 'pontuacao' && <ScoringTab />}
      {tab === 'resultados' && <ResultsTab />}
      {tab === 'participantes' && <ParticipantsTab />}
      {tab === 'sync' && <SyncTab />}
    </>
  );
}

// ---------------------------------------------------------------------------

function ScoringTab() {
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULT_SCORING);
  const [lockAt, setLockAt] = useState<string>('');
  const { msg, ok, err } = useMsg();

  useEffect(() => {
    api<{ scoring: ScoringConfig; lockAt: string | null }>('/api/admin', {
      method: 'POST', body: JSON.stringify({ action: 'settings_get' }),
    }, true).then((r) => {
      setScoring(r.scoring);
      if (r.lockAt) setLockAt(new Date(r.lockAt).toISOString().slice(0, 16));
    }).catch((e) => err(e.message));
  }, []);

  const num = (v: string) => (v === '' ? 0 : Number(v));

  const save = async () => {
    try {
      await api('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'scoring_save', scoring }) }, true);
      await api('/api/admin', {
        method: 'POST',
        body: JSON.stringify({ action: 'lock_save', lockAt: lockAt ? new Date(lockAt).toISOString() : null }),
      }, true);
      ok('Pontuação salva! Os pontos de todo mundo são recalculados automaticamente.');
    } catch (e: any) {
      err(e.message);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Pontos por jogo</h2>
      <div className="form-row">
        <div><label>🎯 Cravou o placar</label><input type="number" value={scoring.exact} onChange={(e) => setScoring({ ...scoring, exact: num(e.target.value) })} /></div>
        <div><label>✅ Vencedor + saldo</label><input type="number" value={scoring.diff} onChange={(e) => setScoring({ ...scoring, diff: num(e.target.value) })} /></div>
        <div><label>➖ Só quem passou</label><input type="number" value={scoring.winner} onChange={(e) => setScoring({ ...scoring, winner: num(e.target.value) })} /></div>
      </div>
      <h2>Peso por fase (multiplicador)</h2>
      <div className="form-row">
        {(['R16', 'QF', 'SF', 'TP', 'F'] as Phase[]).map((ph) => (
          <div key={ph}>
            <label>{PHASE_LABEL[ph]}</label>
            <input type="number" value={scoring.multipliers[ph]}
              onChange={(e) => setScoring({ ...scoring, multipliers: { ...scoring.multipliers, [ph]: num(e.target.value) } })} />
          </div>
        ))}
      </div>
      <h2>Bônus de chaveamento</h2>
      <div className="form-row">
        <div><label>🥈 Semifinalista certo</label><input type="number" value={scoring.bonus.semifinalist} onChange={(e) => setScoring({ ...scoring, bonus: { ...scoring.bonus, semifinalist: num(e.target.value) } })} /></div>
        <div><label>🎖️ Finalista certo</label><input type="number" value={scoring.bonus.finalist} onChange={(e) => setScoring({ ...scoring, bonus: { ...scoring.bonus, finalist: num(e.target.value) } })} /></div>
        <div><label>🥉 3º colocado</label><input type="number" value={scoring.bonus.third} onChange={(e) => setScoring({ ...scoring, bonus: { ...scoring.bonus, third: num(e.target.value) } })} /></div>
        <div><label>🏆 Campeão</label><input type="number" value={scoring.bonus.champion} onChange={(e) => setScoring({ ...scoring, bonus: { ...scoring.bonus, champion: num(e.target.value) } })} /></div>
      </div>
      <h2>Fechamento dos palpites</h2>
      <p className="subtitle">Se vazio, fecha automaticamente no horário do primeiro jogo das oitavas.</p>
      <div className="form-row">
        <div>
          <label>Data e hora (seu fuso)</label>
          <input type="datetime-local" value={lockAt} onChange={(e) => setLockAt(e.target.value)} />
        </div>
      </div>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      <button className="btn" onClick={save}>💾 Salvar tudo</button>
    </div>
  );
}

// ---------------------------------------------------------------------------

const SLOT_LABEL_ADMIN: Record<Slot, string> = {
  R16_1: 'Oitavas 1', R16_2: 'Oitavas 2', R16_3: 'Oitavas 3', R16_4: 'Oitavas 4',
  R16_5: 'Oitavas 5', R16_6: 'Oitavas 6', R16_7: 'Oitavas 7', R16_8: 'Oitavas 8',
  QF_1: 'Quartas 1', QF_2: 'Quartas 2', QF_3: 'Quartas 3', QF_4: 'Quartas 4',
  SF_1: 'Semifinal 1', SF_2: 'Semifinal 2', TP: '3º lugar', F: 'Final',
};

function ResultsTab() {
  const { state, refresh } = useBolao(120_000);
  const [edit, setEdit] = useState<Record<string, any>>({});
  const { msg, ok, err } = useMsg();

  if (!state) return <p className="subtitle">Carregando…</p>;

  const save = async (slot: Slot) => {
    const m = state.matches[slot];
    const e = edit[slot] ?? {};
    try {
      await api('/api/admin', {
        method: 'POST',
        body: JSON.stringify({
          action: 'match_save',
          slot,
          home_name: e.home_name ?? m?.home_name ?? null,
          away_name: e.away_name ?? m?.away_name ?? null,
          home_score: e.home_score ?? m?.home_score ?? null,
          away_score: e.away_score ?? m?.away_score ?? null,
          winner: e.winner ?? m?.winner ?? null,
          status: e.status ?? m?.status ?? 'SCHEDULED',
        }),
      }, true);
      ok(`${SLOT_LABEL_ADMIN[slot]} salvo.`);
      refresh();
    } catch (ex: any) {
      err(ex.message);
    }
  };

  return (
    <>
      <div className="msg info">
        Normalmente a sincronização automática cuida de tudo. Use esta aba só se precisar corrigir
        um resultado ou lançar manualmente (ex.: API fora do ar). O nome do time deve ser em inglês,
        igual ao da API (ex.: <i>Brazil</i>, <i>France</i>).
      </div>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      {SLOTS.map((slot) => {
        const m = state.matches[slot];
        const e = edit[slot] ?? {};
        const val = (field: string, fb: any) => e[field] !== undefined ? e[field] : (fb ?? '');
        const set = (field: string, v: any) => setEdit({ ...edit, [slot]: { ...e, [field]: v } });
        return (
          <div className="card" key={slot}>
            <b>{SLOT_LABEL_ADMIN[slot]}</b> <span className="subtitle">{PHASE_LABEL[phaseOf(slot)]}{m?.kickoff_label ? ` · ${m.kickoff_label}` : ''}</span>
            <div className="form-row" style={{ marginTop: 8 }}>
              <div><label>Mandante</label><input value={val('home_name', m?.home_name)} onChange={(ev) => set('home_name', ev.target.value)} /></div>
              <div style={{ maxWidth: 80 }}><label>Gols</label><input type="number" min={0} value={val('home_score', m?.home_score)} onChange={(ev) => set('home_score', ev.target.value)} /></div>
              <div style={{ maxWidth: 80 }}><label>Gols</label><input type="number" min={0} value={val('away_score', m?.away_score)} onChange={(ev) => set('away_score', ev.target.value)} /></div>
              <div><label>Visitante</label><input value={val('away_name', m?.away_name)} onChange={(ev) => set('away_name', ev.target.value)} /></div>
            </div>
            <div className="form-row">
              <div>
                <label>Situação</label>
                <select value={val('status', m?.status ?? 'SCHEDULED')} onChange={(ev) => set('status', ev.target.value)}>
                  <option value="SCHEDULED">Agendado</option>
                  <option value="LIVE">Ao vivo</option>
                  <option value="FINISHED">Encerrado</option>
                </select>
              </div>
              <div>
                <label>Quem passou (se empatou)</label>
                <select value={val('winner', m?.winner ?? '')} onChange={(ev) => set('winner', ev.target.value || null)}>
                  <option value="">—</option>
                  <option value="HOME">Mandante</option>
                  <option value="AWAY">Visitante</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn small" onClick={() => save(slot)}>Salvar</button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------

function ParticipantsTab() {
  const [list, setList] = useState<any[]>([]);
  const { msg, ok, err } = useMsg();

  const load = () => {
    api<{ participants: any[] }>('/api/admin', {
      method: 'POST', body: JSON.stringify({ action: 'participants_list' }),
    }, true).then((r) => setList(r.participants)).catch((e) => err(e.message));
  };
  useEffect(load, []);

  const del = async (id: string, name: string) => {
    if (!confirm(`Excluir ${name} e todos os seus palpites?`)) return;
    try {
      await api('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'participant_delete', id }) }, true);
      ok(`${name} excluído.`);
      load();
    } catch (e: any) { err(e.message); }
  };

  const resetPin = async (id: string, name: string) => {
    const pin = prompt(`Novo PIN para ${name} (mín. 4 dígitos):`);
    if (!pin) return;
    try {
      await api('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'participant_reset_pin', id, pin }) }, true);
      ok(`PIN de ${name} atualizado.`);
    } catch (e: any) { err(e.message); }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Participantes ({list.length})</h2>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      <table className="rank-table">
        <thead><tr><th>Nome</th><th className="num">Palpites</th><th></th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td className="num">{p.picks}/16</td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button className="btn small secondary" onClick={() => resetPin(p.id, p.name)}>Trocar PIN</button>{' '}
                <button className="btn small danger" onClick={() => del(p.id, p.name)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SyncTab() {
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { msg, ok, err } = useMsg();

  useEffect(() => {
    api<{ lastSync: string | null }>('/api/admin', {
      method: 'POST', body: JSON.stringify({ action: 'settings_get' }),
    }, true).then((r) => setLastSync(r.lastSync)).catch(() => {});
  }, []);

  const sync = async () => {
    setBusy(true);
    try {
      const r = await api<{ message: string }>('/api/admin', {
        method: 'POST', body: JSON.stringify({ action: 'sync' }),
      }, true);
      ok(r.message);
      setLastSync(new Date().toISOString());
    } catch (e: any) {
      err(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Sincronização com a API</h2>
      <p className="subtitle">
        Os resultados vêm da <a href="https://worldcup26.ir" target="_blank" rel="noreferrer">World Cup 2026 API</a> (gratuita,
        sem chave). A sincronização acontece sozinha: a cada minuto durante os jogos, sempre que
        alguém abre o site, e uma vez por dia via cron da Vercel. Este botão força uma atualização agora.
      </p>
      {lastSync && <p className="subtitle">Última sincronização: {new Date(lastSync).toLocaleString('pt-BR')}</p>}
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      <button className="btn" onClick={sync} disabled={busy}>{busy ? 'Sincronizando…' : '🔄 Sincronizar agora'}</button>
    </div>
  );
}
