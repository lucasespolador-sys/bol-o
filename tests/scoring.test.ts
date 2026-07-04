import assert from 'node:assert';
import { derivePredictedTeams, scoreParticipant, scoreSlot } from '../lib/scoring';
import { DEFAULT_SCORING, Match, Picks, Slot } from '../lib/types';

function match(slot: Slot, home: string, away: string, hs: number | null, as_: number | null, opts: Partial<Match> = {}): Match {
  return {
    slot, api_match_id: null,
    home_name: home, away_name: away, home_crest: null, away_crest: null,
    home_score: hs, away_score: as_,
    winner: opts.winner ?? null,
    status: opts.status ?? 'FINISHED',
    kickoff: null, kickoff_label: null,
    ...opts,
  } as Match;
}

const cfg = DEFAULT_SCORING;

// Oitavas reais: 8 confrontos definidos
const R16: [Slot, string, string][] = [
  ['R16_1', 'Paraguay', 'France'],
  ['R16_2', 'Canada', 'Morocco'],
  ['R16_3', 'Portugal', 'Spain'],
  ['R16_4', 'United States', 'Belgium'],
  ['R16_5', 'Brazil', 'Norway'],
  ['R16_6', 'Mexico', 'England'],
  ['R16_7', 'Argentina', 'Egypt'],
  ['R16_8', 'Switzerland', 'Colombia'],
];

// ---------------------------------------------------------------------------
// 1. Pontuação de um jogo das oitavas
// ---------------------------------------------------------------------------
{
  const m = match('R16_1', 'Paraguay', 'France', 1, 3);
  const teams = { home: { name: 'Paraguay', crest: null }, away: { name: 'France', crest: null } };

  // Cravou o placar → 10 × 1
  let s = scoreSlot('R16_1', { home_score: 1, away_score: 3, winner: null }, teams, m, cfg);
  assert.equal(s.points, 10, 'cravar placar nas oitavas vale 10');
  assert.equal(s.kind, 'exact');

  // Vencedor + saldo (apostou 0x2, deu 1x3) → 6
  s = scoreSlot('R16_1', { home_score: 0, away_score: 2, winner: null }, teams, m, cfg);
  assert.equal(s.points, 6, 'vencedor + saldo vale 6');
  assert.equal(s.kind, 'diff');

  // Só o vencedor (apostou 0x1) → 3
  s = scoreSlot('R16_1', { home_score: 0, away_score: 1, winner: null }, teams, m, cfg);
  assert.equal(s.points, 3, 'só quem passou vale 3');

  // Errou tudo → 0
  s = scoreSlot('R16_1', { home_score: 2, away_score: 0, winner: null }, teams, m, cfg);
  assert.equal(s.points, 0);
}

// ---------------------------------------------------------------------------
// 2. Empate + pênaltis
// ---------------------------------------------------------------------------
{
  const m = match('R16_2', 'Canada', 'Morocco', 1, 1, { winner: 'AWAY' }); // Marrocos nos pênaltis
  const teams = { home: { name: 'Canada', crest: null }, away: { name: 'Morocco', crest: null } };

  // Cravou 1x1 e acertou quem passou → exact (10)
  let s = scoreSlot('R16_2', { home_score: 1, away_score: 1, winner: 'AWAY' }, teams, m, cfg);
  assert.equal(s.points, 10, 'cravou o placar do empate');

  // Apostou 2x2 com Marrocos passando → saldo igual + vencedor certo → 6
  s = scoreSlot('R16_2', { home_score: 2, away_score: 2, winner: 'AWAY' }, teams, m, cfg);
  assert.equal(s.points, 6, 'empate com saldo igual e vencedor certo vale 6');

  // Apostou 2x1 (Canadá vence) → errou quem passou → 0
  s = scoreSlot('R16_2', { home_score: 2, away_score: 1, winner: null }, teams, m, cfg);
  assert.equal(s.points, 0);

  // Apostou Marrocos 1x0 → acertou só quem passou → 3
  s = scoreSlot('R16_2', { home_score: 0, away_score: 1, winner: null }, teams, m, cfg);
  assert.equal(s.points, 3);
}

// ---------------------------------------------------------------------------
// 3. Quartas: só conta se previu o confronto; multiplicador ×2; ordem invertida
// ---------------------------------------------------------------------------
{
  const matches: Partial<Record<Slot, Match>> = {};
  for (const [slot, h, a] of R16) matches[slot] = match(slot, h, a, null, null, { status: 'SCHEDULED' });

  // Palpites: França e Marrocos vencem as oitavas 1 e 2 → QF_1 = França × Marrocos
  const picks: Picks = {
    R16_1: { home_score: 0, away_score: 2, winner: null }, // França passa
    R16_2: { home_score: 0, away_score: 1, winner: null }, // Marrocos passa
    QF_1: { home_score: 2, away_score: 1, winner: null },  // França 2x1 Marrocos
  };
  const predTeams = derivePredictedTeams(picks, matches);
  assert.equal(predTeams.QF_1.home?.name, 'France');
  assert.equal(predTeams.QF_1.away?.name, 'Morocco');

  // Confronto real igual, mas invertido: Marrocos (casa) 1x2 França → cravou (alinhado)
  const qfSame = match('QF_1', 'Morocco', 'France', 1, 2);
  let s = scoreSlot('QF_1', picks.QF_1, predTeams.QF_1, qfSame, cfg);
  assert.equal(s.kind, 'exact');
  assert.equal(s.points, 10 * 2, 'cravar nas quartas vale 20 (×2)');

  // Confronto real diferente (França × Canadá): não conta
  const qfOther = match('QF_1', 'France', 'Canada', 2, 1);
  s = scoreSlot('QF_1', picks.QF_1, predTeams.QF_1, qfOther, cfg);
  assert.equal(s.kind, 'not_counted');
  assert.equal(s.points, 0, 'confronto não previsto não pontua');
}

// ---------------------------------------------------------------------------
// 4. Final ×4: cravar vale 40. Bônus de chaveamento completo.
// ---------------------------------------------------------------------------
{
  const matches: Partial<Record<Slot, Match>> = {};
  for (const [slot, h, a] of R16) matches[slot] = match(slot, h, a, 0, 1); // visitante sempre vence
  // Reais: QF France×Morocco, Spain×Belgium, Norway×England, Egypt×Colombia
  matches.QF_1 = match('QF_1', 'France', 'Morocco', 2, 0);
  matches.QF_2 = match('QF_2', 'Spain', 'Belgium', 1, 0);
  matches.QF_3 = match('QF_3', 'Norway', 'England', 0, 2);
  matches.QF_4 = match('QF_4', 'Egypt', 'Colombia', 0, 1);
  matches.SF_1 = match('SF_1', 'France', 'Spain', 1, 0);
  matches.SF_2 = match('SF_2', 'England', 'Colombia', 3, 1);
  matches.TP = match('TP', 'Spain', 'Colombia', 2, 0);
  matches.F = match('F', 'France', 'England', 3, 1);

  // Participante que acertou tudo
  const picks: Picks = {
    R16_1: { home_score: 0, away_score: 1, winner: null },
    R16_2: { home_score: 0, away_score: 1, winner: null },
    R16_3: { home_score: 0, away_score: 1, winner: null },
    R16_4: { home_score: 0, away_score: 1, winner: null },
    R16_5: { home_score: 0, away_score: 1, winner: null },
    R16_6: { home_score: 0, away_score: 1, winner: null },
    R16_7: { home_score: 0, away_score: 1, winner: null },
    R16_8: { home_score: 0, away_score: 1, winner: null },
    QF_1: { home_score: 2, away_score: 0, winner: null },
    QF_2: { home_score: 1, away_score: 0, winner: null },
    QF_3: { home_score: 0, away_score: 2, winner: null },
    QF_4: { home_score: 0, away_score: 1, winner: null },
    SF_1: { home_score: 1, away_score: 0, winner: null },
    SF_2: { home_score: 3, away_score: 1, winner: null },
    TP: { home_score: 2, away_score: 0, winner: null },
    F: { home_score: 3, away_score: 1, winner: null },
  };

  const r = scoreParticipant(picks, matches, cfg);

  // Jogos: 8 oitavas cravadas (80) + 4 quartas cravadas (4×20=80)
  //        + 2 semis cravadas (2×30=60) + 3º cravado (20) + final cravada (40)
  assert.equal(r.matchPoints, 80 + 80 + 60 + 20 + 40, 'pontos dos jogos do gabarito perfeito');
  assert.equal(r.slots.F.points, 40, 'cravar o placar da final vale 40');

  // Bônus: 4 semifinalistas (32) + 2 finalistas (24) + 3º (8) + campeão (25)
  assert.equal(r.bonus.semifinalists, 4);
  assert.equal(r.bonus.finalists, 2);
  assert.ok(r.bonus.third);
  assert.ok(r.bonus.champion);
  assert.equal(r.bonus.points, 4 * 8 + 2 * 12 + 8 + 25);

  assert.equal(r.total, 280 + 89);
}

// ---------------------------------------------------------------------------
// 5. Bônus parcial: semifinalista certo por caminho diferente ainda conta
// ---------------------------------------------------------------------------
{
  const matches: Partial<Record<Slot, Match>> = {};
  for (const [slot, h, a] of R16) matches[slot] = match(slot, h, a, 0, 1);
  matches.SF_1 = match('SF_1', 'France', 'Spain', null, null, { status: 'SCHEDULED' });
  matches.SF_2 = match('SF_2', 'England', 'Colombia', null, null, { status: 'SCHEDULED' });

  // Só previu França e Inglaterra nas semis (2 certos de 4 possíveis)
  const picks: Picks = {
    R16_1: { home_score: 0, away_score: 1, winner: null }, // França
    R16_2: { home_score: 1, away_score: 0, winner: null }, // Canadá (errado, foi Marrocos)
    R16_5: { home_score: 1, away_score: 0, winner: null }, // Brasil (errado)
    R16_6: { home_score: 0, away_score: 1, winner: null }, // Inglaterra
    QF_1: { home_score: 1, away_score: 0, winner: null },  // França passa
    QF_3: { home_score: 0, away_score: 1, winner: null },  // Inglaterra passa
  };
  const r = scoreParticipant(picks, matches, cfg);
  assert.equal(r.bonus.semifinalists, 2, 'França e Inglaterra semifinalistas contam mesmo com o resto errado');
  assert.equal(r.bonus.points, 2 * 8);
}

// ---------------------------------------------------------------------------
// 6. Palpite jogo a jogo: substitui o do quadro naquele jogo, sem dupla
//    contagem, e vale mesmo quando o quadro não previu o confronto
// ---------------------------------------------------------------------------
{
  const matches: Partial<Record<Slot, Match>> = {};
  for (const [slot, h, a] of R16) matches[slot] = match(slot, h, a, 0, 1); // visitante vence
  // Real: QF_1 = França × Marrocos 2x0
  matches.QF_1 = match('QF_1', 'France', 'Morocco', 2, 0);

  // Quadro previu Paraguai e Canadá (errou as duas oitavas) → QF_1 previsto
  // era Paraguai × Canadá: não contaria nada nas quartas
  const picks: Picks = {
    R16_1: { home_score: 1, away_score: 0, winner: null }, // Paraguai (errado)
    R16_2: { home_score: 1, away_score: 0, winner: null }, // Canadá (errado)
    QF_1: { home_score: 2, away_score: 0, winner: null },
  };

  // Sem ajuste: quartas não contam (confronto diferente)
  let r = scoreParticipant(picks, matches, cfg);
  assert.equal(r.slots.QF_1.points, 0);
  assert.equal(r.slots.QF_1.kind, 'not_counted');

  // Com ajuste jogo a jogo no confronto real: cravou → 10 × 2, sem dupla contagem
  r = scoreParticipant(picks, matches, cfg, { QF_1: { home_score: 2, away_score: 0, winner: null } });
  assert.equal(r.slots.QF_1.points, 20, 'ajuste jogo a jogo vale no confronto real');
  assert.equal(r.slots.QF_1.kind, 'exact');
  assert.equal(r.slots.QF_1.source, 'live');

  // O ajuste substitui o palpite do quadro naquele jogo (não soma os dois)
  const noLive = scoreParticipant(picks, matches, cfg).matchPoints;
  const withLive = r.matchPoints;
  assert.equal(withLive, noLive + 20, 'ajuste substitui, não duplica');

  // Ajuste errado por cima de quadro certo: vale o ajuste
  const picksCertos: Picks = {
    R16_1: { home_score: 0, away_score: 1, winner: null }, // França
    R16_2: { home_score: 0, away_score: 1, winner: null }, // Marrocos
    QF_1: { home_score: 2, away_score: 0, winner: null },  // cravaria
  };
  const r2 = scoreParticipant(picksCertos, matches, cfg, { QF_1: { home_score: 0, away_score: 1, winner: null } });
  assert.equal(r2.slots.QF_1.points, 0, 'ajuste substitui o quadro mesmo quando piora');
}

// ---------------------------------------------------------------------------
// 7. Jogo não terminado não pontua
// ---------------------------------------------------------------------------
{
  const m = match('R16_1', 'Paraguay', 'France', 1, 1, { status: 'LIVE' });
  const teams = { home: { name: 'Paraguay', crest: null }, away: { name: 'France', crest: null } };
  const s = scoreSlot('R16_1', { home_score: 1, away_score: 1, winner: 'HOME' }, teams, m, cfg);
  assert.equal(s.points, 0);
  assert.equal(s.kind, 'pending');
}

console.log('✅ Todos os testes de pontuação passaram!');
