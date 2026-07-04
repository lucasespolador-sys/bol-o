import {
  FEEDERS, Match, Phase, phaseOf, Pick, Picks, ScoringConfig, Slot, SLOTS, Team,
} from './types';

// ---------------------------------------------------------------------------
// Derivação do chaveamento previsto: a partir dos palpites das oitavas,
// descobrimos os times que o participante colocou nas quartas, semis, etc.
// ---------------------------------------------------------------------------

function pickAdvancer(pick: Pick | undefined): 'HOME' | 'AWAY' | null {
  if (!pick) return null;
  if (pick.home_score > pick.away_score) return 'HOME';
  if (pick.away_score > pick.home_score) return 'AWAY';
  return pick.winner; // empate: precisa do vencedor nos pênaltis
}

export interface SlotTeams {
  home: Team | null;
  away: Team | null;
}

/**
 * Retorna os times previstos em cada jogo do quadro do participante.
 * Oitavas vêm dos jogos reais; das quartas em diante, dos palpites anteriores.
 */
export function derivePredictedTeams(
  picks: Picks,
  matches: Partial<Record<Slot, Match>>,
): Record<Slot, SlotTeams> {
  const result = {} as Record<Slot, SlotTeams>;

  const teamOf = (slot: Slot, side: 'HOME' | 'AWAY'): Team | null => {
    const t = result[slot]?.[side === 'HOME' ? 'home' : 'away'];
    return t ?? null;
  };

  const advancerOf = (slot: Slot): Team | null => {
    const side = pickAdvancer(picks[slot]);
    if (!side) return null;
    return teamOf(slot, side);
  };

  const loserOf = (slot: Slot): Team | null => {
    const side = pickAdvancer(picks[slot]);
    if (!side) return null;
    return teamOf(slot, side === 'HOME' ? 'AWAY' : 'HOME');
  };

  for (const slot of SLOTS) {
    if (phaseOf(slot) === 'R16') {
      const m = matches[slot];
      result[slot] = {
        home: m?.home_name ? { name: m.home_name, crest: m.home_crest } : null,
        away: m?.away_name ? { name: m.away_name, crest: m.away_crest } : null,
      };
    } else {
      const [a, b] = FEEDERS[slot]!;
      result[slot] = slot === 'TP'
        ? { home: loserOf(a), away: loserOf(b) }
        : { home: advancerOf(a), away: advancerOf(b) };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pontuação de um jogo
// ---------------------------------------------------------------------------

function matchAdvancer(m: Match): string | null {
  if (m.home_score == null || m.away_score == null) return null;
  if (m.home_score > m.away_score) return m.home_name;
  if (m.away_score > m.home_score) return m.away_name;
  if (m.winner === 'HOME') return m.home_name;
  if (m.winner === 'AWAY') return m.away_name;
  return null;
}

export type HitKind = 'exact' | 'diff' | 'winner' | 'none' | 'not_counted' | 'pending';

export interface SlotScore {
  slot: Slot;
  kind: HitKind;
  base: number;
  multiplier: number;
  points: number;
  /** de onde veio o palpite usado: quadro fixo ou ajuste jogo a jogo */
  source?: 'quadro' | 'live';
}

/**
 * Pontua um jogo. `predTeams` são os times que o participante previu para o
 * confronto (das quartas em diante, o placar só conta se o confronto previsto
 * for o mesmo que aconteceu de verdade — regra do bolão).
 */
export function scoreSlot(
  slot: Slot,
  pick: Pick | undefined,
  predTeams: SlotTeams,
  match: Match | undefined,
  cfg: ScoringConfig,
): SlotScore {
  const phase: Phase = phaseOf(slot);
  const multiplier = cfg.multipliers[phase] ?? 1;
  const zero = (kind: HitKind): SlotScore => ({ slot, kind, base: 0, multiplier, points: 0 });

  if (!pick) return zero('none');
  if (!match || match.status !== 'FINISHED' || match.home_score == null || match.away_score == null
    || !match.home_name || !match.away_name) {
    return zero('pending');
  }

  // Alinha o palpite com o jogo real (o confronto previsto pode ter os times
  // em ordem invertida em relação ao jogo real).
  let predHomeGoals = pick.home_score;
  let predAwayGoals = pick.away_score;
  let predAdvancer: string | null;

  if (phase === 'R16') {
    // Nas oitavas o confronto é o mesmo para todo mundo.
    predAdvancer = pickAdvancer(pick) === 'HOME' ? match.home_name
      : pickAdvancer(pick) === 'AWAY' ? match.away_name : null;
  } else {
    const ph = predTeams.home?.name ?? null;
    const pa = predTeams.away?.name ?? null;
    if (!ph || !pa) return zero('not_counted');
    const sameOrder = ph === match.home_name && pa === match.away_name;
    const swapped = ph === match.away_name && pa === match.home_name;
    if (!sameOrder && !swapped) return zero('not_counted'); // não previu esse confronto
    if (swapped) {
      predHomeGoals = pick.away_score;
      predAwayGoals = pick.home_score;
    }
    const side = pickAdvancer(pick);
    predAdvancer = side === 'HOME' ? ph : side === 'AWAY' ? pa : null;
  }

  const actualAdvancer = matchAdvancer(match);

  let base = 0;
  let kind: HitKind = 'none';

  if (predHomeGoals === match.home_score && predAwayGoals === match.away_score) {
    base = cfg.exact; kind = 'exact';
  } else if (
    predAdvancer && predAdvancer === actualAdvancer
    && (predHomeGoals - predAwayGoals) === (match.home_score - match.away_score)
  ) {
    base = cfg.diff; kind = 'diff';
  } else if (predAdvancer && predAdvancer === actualAdvancer) {
    base = cfg.winner; kind = 'winner';
  }

  return { slot, kind, base, multiplier, points: base * multiplier, source: 'quadro' };
}

/**
 * Pontua um palpite "jogo a jogo": feito sobre o confronto real, na mesma
 * orientação (mandante/visitante) do jogo — comparação direta, vale para
 * qualquer fase.
 */
export function scoreSlotLive(
  slot: Slot,
  pick: Pick,
  match: Match | undefined,
  cfg: ScoringConfig,
): SlotScore {
  const phase: Phase = phaseOf(slot);
  const multiplier = cfg.multipliers[phase] ?? 1;
  if (!match || match.status !== 'FINISHED' || match.home_score == null || match.away_score == null
    || !match.home_name || !match.away_name) {
    return { slot, kind: 'pending', base: 0, multiplier, points: 0, source: 'live' };
  }

  const side = pickAdvancer(pick);
  const predAdvancer = side === 'HOME' ? match.home_name : side === 'AWAY' ? match.away_name : null;
  const actualAdvancer = matchAdvancer(match);

  let base = 0;
  let kind: HitKind = 'none';
  if (pick.home_score === match.home_score && pick.away_score === match.away_score) {
    base = cfg.exact; kind = 'exact';
  } else if (
    predAdvancer && predAdvancer === actualAdvancer
    && (pick.home_score - pick.away_score) === (match.home_score - match.away_score)
  ) {
    base = cfg.diff; kind = 'diff';
  } else if (predAdvancer && predAdvancer === actualAdvancer) {
    base = cfg.winner; kind = 'winner';
  }

  return { slot, kind, base, multiplier, points: base * multiplier, source: 'live' };
}

// ---------------------------------------------------------------------------
// Bônus de chaveamento
// ---------------------------------------------------------------------------

export interface BonusScore {
  semifinalists: number; // quantos semifinalistas acertou (0-4)
  finalists: number;     // quantos finalistas acertou (0-2)
  third: boolean;
  champion: boolean;
  points: number;
}

export function scoreBonus(
  predTeams: Record<Slot, SlotTeams>,
  picks: Picks,
  matches: Partial<Record<Slot, Match>>,
  cfg: ScoringConfig,
): BonusScore {
  const names = (slots: Slot[], source: 'pred' | 'actual'): Set<string> => {
    const s = new Set<string>();
    for (const slot of slots) {
      if (source === 'pred') {
        const t = predTeams[slot];
        if (t?.home?.name) s.add(t.home.name);
        if (t?.away?.name) s.add(t.away.name);
      } else {
        const m = matches[slot];
        if (m?.home_name) s.add(m.home_name);
        if (m?.away_name) s.add(m.away_name);
      }
    }
    return s;
  };

  const actualSemi = names(['SF_1', 'SF_2'], 'actual');
  const predSemi = names(['SF_1', 'SF_2'], 'pred');
  let semifinalists = 0;
  for (const n of predSemi) if (actualSemi.has(n)) semifinalists++;

  const actualFinal = names(['F'], 'actual');
  const predFinal = names(['F'], 'pred');
  let finalists = 0;
  for (const n of predFinal) if (actualFinal.has(n)) finalists++;

  const predAdvName = (slot: Slot): string | null => {
    const side = pickAdvancer(picks[slot]);
    if (!side) return null;
    return (side === 'HOME' ? predTeams[slot]?.home?.name : predTeams[slot]?.away?.name) ?? null;
  };

  const tpMatch = matches['TP'];
  const fMatch = matches['F'];
  const actualThird = tpMatch && tpMatch.status === 'FINISHED' ? matchAdvancer(tpMatch) : null;
  const actualChampion = fMatch && fMatch.status === 'FINISHED' ? matchAdvancer(fMatch) : null;

  const third = !!actualThird && predAdvName('TP') === actualThird;
  const champion = !!actualChampion && predAdvName('F') === actualChampion;

  const points =
    semifinalists * cfg.bonus.semifinalist +
    finalists * cfg.bonus.finalist +
    (third ? cfg.bonus.third : 0) +
    (champion ? cfg.bonus.champion : 0);

  return { semifinalists, finalists, third, champion, points };
}

// ---------------------------------------------------------------------------
// Total de um participante
// ---------------------------------------------------------------------------

export interface ParticipantScore {
  matchPoints: number;
  bonus: BonusScore;
  total: number;
  slots: Record<string, SlotScore>;
  predTeams: Record<Slot, SlotTeams>;
}

/**
 * Total do participante. Em cada jogo vale UM palpite (sem contagem dupla):
 * o ajuste "jogo a jogo" se existir; senão, o do quadro fixo (nas oitavas
 * sempre; das quartas em diante só se o confronto previsto aconteceu).
 * Os bônus de chaveamento vêm sempre do quadro fixo.
 */
export function scoreParticipant(
  picks: Picks,
  matches: Partial<Record<Slot, Match>>,
  cfg: ScoringConfig,
  livePicks: Picks = {},
): ParticipantScore {
  const predTeams = derivePredictedTeams(picks, matches);
  const slots: Record<string, SlotScore> = {};
  let matchPoints = 0;

  for (const slot of SLOTS) {
    const live = livePicks[slot];
    const s = live
      ? scoreSlotLive(slot, live, matches[slot], cfg)
      : scoreSlot(slot, picks[slot], predTeams[slot], matches[slot], cfg);
    slots[slot] = s;
    matchPoints += s.points;
  }

  const bonus = scoreBonus(predTeams, picks, matches, cfg);
  return { matchPoints, bonus, total: matchPoints + bonus.points, slots, predTeams };
}
