'use client';

import { useMemo } from 'react';
import { useBolaoCtx } from './BolaoProvider';
import Trophy from './Trophy';
import { derivePredictedTeams, scoreParticipant, SlotScore } from '@/lib/scoring';
import { teamCode, teamNamePt } from '@/lib/teamNames';
import { Match, Picks, Slot } from '@/lib/types';

// Chaveamento em pôster espelhado: os dois lados convergem para a final,
// com a taça no centro (como nos quadros oficiais da Copa)
const LEFT_R16: [Slot, Slot][] = [['R16_1', 'R16_2'], ['R16_3', 'R16_4']];
const RIGHT_R16: [Slot, Slot][] = [['R16_5', 'R16_6'], ['R16_7', 'R16_8']];

interface TeamRowProps {
  name: string | null;
  crest: string | null;
  score: number | null;
  advanced: boolean;
  predicted?: boolean;
  pen?: number | null;
}

function TeamRow({ name, crest, score, advanced, predicted }: TeamRowProps) {
  return (
    <div className={`bk-team ${advanced ? 'winner' : ''} ${predicted ? 'predicted' : ''}`}>
      {crest && name
        ? <img src={crest} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        : <span className="bk-shield">🛡️</span>}
      <span className="bk-code" title={name ? teamNamePt(name) : ''}>{name ? teamCode(name) : 'A DEFINIR'}</span>
      <span className="bk-score">{score ?? ''}</span>
    </div>
  );
}

export default function Bracket({ participantId }: { participantId?: string | null }) {
  const { state } = useBolaoCtx();

  const target = participantId || state?.me?.id || null;
  const isMe = !!state?.me?.id && target === state.me.id;

  const data = useMemo(() => {
    if (!state) return null;
    let picks: Picks = {};
    let livePicks: Picks = {};
    let name: string | null = null;
    if (isMe && state.me) {
      picks = state.me.picks ?? {};
      livePicks = state.me.livePicks ?? {};
      name = state.me.name;
    } else if (target && state.board) {
      const b = state.board.find((x) => x.id === target);
      if (b) { picks = b.picks; livePicks = b.livePicks ?? {}; name = b.name; }
    } else if (target && !state.board) {
      return { hidden: true as const };
    }
    const score = scoreParticipant(picks, state.matches, state.scoring, livePicks);
    const predTeams = derivePredictedTeams(picks, state.matches);
    return { hidden: false as const, picks, livePicks, name, score, predTeams };
  }, [state, target, isMe]);

  if (!state) return null;
  if (!target) {
    return <div className="msg info">Entre em <b>Meus Palpites</b> para ver o seu chaveamento aqui.</div>;
  }
  if (!data || data.hidden) {
    return <div className="msg info">🔒 O bolão dos outros participantes fica visível quando o mata-mata começa.</div>;
  }

  const { picks, livePicks, score, predTeams } = data;
  const matches = state.matches;

  // Palpite exibido (o que vale na pontuação): ajuste ao vivo, senão o do
  // quadro alinhado ao confronto real
  const displayPick = (slot: Slot): { h: number; a: number; live: boolean } | null => {
    const live = livePicks[slot];
    if (live) return { h: live.home_score, a: live.away_score, live: true };
    const p = picks[slot];
    const m = matches[slot];
    if (!p) return null;
    if (slot.startsWith('R16')) return { h: p.home_score, a: p.away_score, live: false };
    const ph = predTeams[slot]?.home?.name;
    const pa = predTeams[slot]?.away?.name;
    if (!m?.home_name || !m?.away_name) return { h: p.home_score, a: p.away_score, live: false };
    if (ph === m.home_name && pa === m.away_name) return { h: p.home_score, a: p.away_score, live: false };
    if (ph === m.away_name && pa === m.home_name) return { h: p.away_score, a: p.home_score, live: false };
    return null; // previu outro confronto
  };

  const cardStatus = (slot: Slot, m: Match | undefined, sc: SlotScore | undefined) => {
    if (!m || m.status !== 'FINISHED') {
      return { icon: m?.status === 'LIVE' ? '🔴' : '🕓', cls: 'pending', pts: null as number | null };
    }
    if (!sc || sc.kind === 'none') return { icon: '❌', cls: 'wrong', pts: null };
    if (sc.kind === 'not_counted') return { icon: '➖', cls: 'skipped', pts: null };
    if (sc.points > 0) return { icon: '✅', cls: 'right', pts: sc.points };
    return { icon: '❌', cls: 'wrong', pts: null };
  };

  const advancerSide = (m: Match | undefined): 'HOME' | 'AWAY' | null => {
    if (!m || m.status !== 'FINISHED' || m.home_score == null || m.away_score == null) return null;
    if (m.home_score > m.away_score) return 'HOME';
    if (m.away_score > m.home_score) return 'AWAY';
    return m.winner;
  };

  const renderCard = (slot: Slot) => {
    const m = matches[slot];
    const sc = score.slots[slot];
    const st = cardStatus(slot, m, sc);
    const started = m && m.status !== 'SCHEDULED';
    const adv = advancerSide(m);
    const pk = displayPick(slot);

    // Sem confronto real definido: mostra os times previstos pelo participante
    const usePred = !m?.home_name && !m?.away_name;
    const homeName = m?.home_name ?? predTeams[slot]?.home?.name ?? null;
    const awayName = m?.away_name ?? predTeams[slot]?.away?.name ?? null;
    const homeCrest = m?.home_crest ?? predTeams[slot]?.home?.crest ?? null;
    const awayCrest = m?.away_crest ?? predTeams[slot]?.away?.crest ?? null;

    return (
      <div className={`bk-card ${st.cls}`} key={slot}>
        <div className="bk-head">
          <span>{slot === 'TP' ? '3º lugar · ' : ''}{m?.kickoff_label?.split(' (')[0] ?? 'a definir'}</span>
          <span className="bk-icon">{st.icon}{st.pts != null && <b className="bk-pts">+{st.pts}</b>}</span>
        </div>
        <TeamRow name={homeName} crest={homeCrest} score={started ? m!.home_score : null} advanced={adv === 'HOME'} predicted={usePred && !!homeName} />
        <TeamRow name={awayName} crest={awayCrest} score={started ? m!.away_score : null} advanced={adv === 'AWAY'} predicted={usePred && !!awayName} />
        {m?.status === 'FINISHED' && m.home_score === m.away_score && m.winner && (
          <div className="bk-pen">{teamNamePt(m.winner === 'HOME' ? m.home_name : m.away_name)} nos pênaltis</div>
        )}
        <div className="bk-pickline">
          {pk ? <>Palpite: <b>{pk.h}×{pk.a}</b>{pk.live && ' ⚡'}</> : (picks[slot] ? 'previu outro confronto' : 'não palpitou')}
        </div>
      </div>
    );
  };

  return (
    <div className="bracket-scroll">
      <div className="bracket mirror">
        {/* lado esquerdo */}
        <div className="bk-col">
          <div className="bk-col-title">Oitavas</div>
          {LEFT_R16.map((pair, i) => (
            <div className="bk-pair" key={i}>{pair.map((slot) => renderCard(slot))}</div>
          ))}
        </div>
        <div className="bk-col">
          <div className="bk-col-title">Quartas</div>
          <div className="bk-pair solo">{renderCard('QF_1')}</div>
          <div className="bk-pair solo">{renderCard('QF_2')}</div>
        </div>
        <div className="bk-col">
          <div className="bk-col-title">Semifinal</div>
          <div className="bk-pair solo">{renderCard('SF_1')}</div>
        </div>

        {/* centro: taça + final + 3º lugar */}
        <div className="bk-col bk-center">
          <Trophy size={84} />
          <div className="bk-col-title gold">🏆 Final</div>
          {renderCard('F')}
          <div className="bk-col-title">3º lugar</div>
          {renderCard('TP')}
        </div>

        {/* lado direito (espelhado) */}
        <div className="bk-col right">
          <div className="bk-col-title">Semifinal</div>
          <div className="bk-pair solo">{renderCard('SF_2')}</div>
        </div>
        <div className="bk-col right">
          <div className="bk-col-title">Quartas</div>
          <div className="bk-pair solo">{renderCard('QF_3')}</div>
          <div className="bk-pair solo">{renderCard('QF_4')}</div>
        </div>
        <div className="bk-col right">
          <div className="bk-col-title">Oitavas</div>
          {RIGHT_R16.map((pair, i) => (
            <div className="bk-pair" key={i}>{pair.map((slot) => renderCard(slot))}</div>
          ))}
        </div>
      </div>
      <div className="bk-legend">
        <span>✅ Palpite certo</span>
        <span>❌ Palpite errado</span>
        <span>➖ Não palpitado</span>
        <span>🕓 Não iniciado</span>
        <span>⚡ Ajuste jogo a jogo</span>
      </div>
    </div>
  );
}
