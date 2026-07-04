// Fases do mata-mata (a partir das oitavas, como nas regras do bolão)
export type Phase = 'R16' | 'QF' | 'SF' | 'TP' | 'F';

export const SLOTS = [
  'R16_1', 'R16_2', 'R16_3', 'R16_4', 'R16_5', 'R16_6', 'R16_7', 'R16_8',
  'QF_1', 'QF_2', 'QF_3', 'QF_4',
  'SF_1', 'SF_2',
  'TP', 'F',
] as const;

export type Slot = (typeof SLOTS)[number];

export type Side = 'HOME' | 'AWAY';

export interface Team {
  name: string;
  crest: string | null;
}

export interface Match {
  slot: Slot;
  api_match_id: number | null;
  home_name: string | null;
  away_name: string | null;
  home_crest: string | null;
  away_crest: string | null;
  home_score: number | null;
  away_score: number | null;
  winner: Side | null; // quem avançou quando o placar empata (pênaltis)
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  kickoff: string | null;
  kickoff_label: string | null;
}

export interface Pick {
  home_score: number;
  away_score: number;
  winner: Side | null; // obrigatório quando o placar previsto empata
}

export type Picks = Partial<Record<Slot, Pick>>;

export interface Participant {
  id: string;
  name: string;
  is_admin: boolean;
}

export interface ScoringConfig {
  exact: number;      // cravou o placar
  diff: number;       // vencedor + saldo de gols
  winner: number;     // só quem passou
  multipliers: Record<Phase, number>;
  bonus: {
    semifinalist: number; // cada semifinalista certo
    finalist: number;     // cada finalista certo
    third: number;        // acertar o 3o colocado
    champion: number;     // acertar o campeão
  };
}

export const DEFAULT_SCORING: ScoringConfig = {
  exact: 10,
  diff: 6,
  winner: 3,
  multipliers: { R16: 1, QF: 2, SF: 3, TP: 2, F: 4 },
  bonus: { semifinalist: 8, finalist: 12, third: 8, champion: 25 },
};

export const PHASE_LABEL: Record<Phase, string> = {
  R16: 'Oitavas de final',
  QF: 'Quartas de final',
  SF: 'Semifinal',
  TP: 'Disputa de 3º lugar',
  F: 'Final',
};

export function phaseOf(slot: Slot): Phase {
  if (slot.startsWith('R16')) return 'R16';
  if (slot.startsWith('QF')) return 'QF';
  if (slot.startsWith('SF')) return 'SF';
  return slot as Phase; // 'TP' | 'F'
}

// Chaveamento fixo: quem alimenta cada jogo
export const FEEDERS: Partial<Record<Slot, [Slot, Slot]>> = {
  QF_1: ['R16_1', 'R16_2'],
  QF_2: ['R16_3', 'R16_4'],
  QF_3: ['R16_5', 'R16_6'],
  QF_4: ['R16_7', 'R16_8'],
  SF_1: ['QF_1', 'QF_2'],
  SF_2: ['QF_3', 'QF_4'],
  TP: ['SF_1', 'SF_2'],
  F: ['SF_1', 'SF_2'],
};
