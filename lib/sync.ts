import { ensureSchema, getSetting, getSql, setSetting } from './db';
import { Match, Slot, SLOTS } from './types';

// Sincroniza os jogos do mata-mata com a World Cup 2026 API
// (https://worldcup26.ir — gratuita, sem chave). O placar gravado é o do
// jogo (com prorrogação); pênaltis definem quem avançou quando empata.

const API_BASE = process.env.WC_API_BASE || 'https://worldcup26.ir';

// Chaveamento oficial: jogo 97 = V89 x V90, 98 = V93 x V94, 99 = V91 x V92,
// 100 = V95 x V96, 101 = V97 x V98, 102 = V99 x V100, 103 = P101 x P102,
// 104 = V101 x V102. Os slots abaixo preservam essa estrutura
// (QF_1 = V(R16_1) x V(R16_2), SF_1 = V(QF_1) x V(QF_2), ...).
const SLOT_TO_GAME: Record<Slot, number> = {
  R16_1: 89, R16_2: 90, R16_3: 93, R16_4: 94,
  R16_5: 91, R16_6: 92, R16_7: 95, R16_8: 96,
  QF_1: 97, QF_2: 98, QF_3: 99, QF_4: 100,
  SF_1: 101, SF_2: 102, TP: 103, F: 104,
};

interface ApiGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  home_penalty_score?: string | null;
  away_penalty_score?: string | null;
  winner_team_id?: string | null;
  finished: string;      // "TRUE" | "FALSE"
  time_elapsed: string;  // "notstarted" | "live" | minutos | "finished"
  local_date: string;    // "MM/DD/YYYY HH:mm" (hora local do estádio)
  type: string;
  home_team_name_en?: string | null;
  away_team_name_en?: string | null;
}

interface ApiTeam {
  id: string;
  name_en: string;
  flag: string | null;
}

function toInt(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function mapStatus(g: ApiGame): Match['status'] {
  if (g.finished === 'TRUE') return 'FINISHED';
  if (g.time_elapsed && g.time_elapsed !== 'notstarted') return 'LIVE';
  return 'SCHEDULED';
}

// "MM/DD/YYYY HH:mm" (hora do estádio, EUA/México/Canadá) → ISO aproximado.
// Usamos offset -05:00 como referência; serve para ordenar e detectar
// "jogo hoje". A hora exibida no site é a local do estádio.
function parseKickoff(localDate: string | null | undefined): { iso: string | null; label: string | null } {
  if (!localDate) return { iso: null, label: null };
  const m = localDate.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return { iso: null, label: localDate };
  const [, mm, dd, yyyy, hh, min] = m;
  return {
    iso: `${yyyy}-${mm}-${dd}T${hh}:${min}:00-05:00`,
    label: `${dd}/${mm} às ${hh}:${min} (hora local do estádio)`,
  };
}

export interface SyncResult {
  ok: boolean;
  message: string;
  updated?: number;
}

export async function syncMatches(force = false): Promise<SyncResult> {
  await ensureSchema();

  const last = await getSetting<string | null>('last_sync', null);
  if (!force && last && Date.now() - new Date(last).getTime() < 60_000) {
    return { ok: true, message: 'Sincronizado há menos de 1 minuto.', updated: 0 };
  }
  await setSetting('last_sync', new Date().toISOString());

  const headers = { accept: 'application/json' };
  const [gamesRes, teamsRes] = await Promise.all([
    fetch(`${API_BASE}/get/games`, { headers, cache: 'no-store' }),
    fetch(`${API_BASE}/get/teams`, { headers, cache: 'no-store' }),
  ]);
  if (!gamesRes.ok) {
    return { ok: false, message: `API respondeu ${gamesRes.status} em /get/games` };
  }

  const gamesBody = await gamesRes.json();
  const games: ApiGame[] = Array.isArray(gamesBody) ? gamesBody : gamesBody.games ?? [];
  const byId = new Map<number, ApiGame>();
  for (const g of games) byId.set(parseInt(g.id, 10), g);

  const teamById = new Map<string, ApiTeam>();
  if (teamsRes.ok) {
    const teamsBody = await teamsRes.json();
    const teams: ApiTeam[] = Array.isArray(teamsBody) ? teamsBody : teamsBody.teams ?? [];
    for (const t of teams) teamById.set(String(t.id), t);
  }

  const teamName = (id: string | null | undefined, fallback: string | null | undefined): string | null => {
    if (!id || id === '0') return fallback?.trim() || null;
    return teamById.get(String(id))?.name_en ?? fallback?.trim() ?? null;
  };
  const teamFlag = (id: string | null | undefined): string | null => {
    if (!id || id === '0') return null;
    return teamById.get(String(id))?.flag ?? null;
  };

  const sql = getSql();
  let updated = 0;

  for (const slot of SLOTS) {
    const g = byId.get(SLOT_TO_GAME[slot]);
    if (!g) continue;

    const status = mapStatus(g);
    const homeName = teamName(g.home_team_id, g.home_team_name_en);
    const awayName = teamName(g.away_team_id, g.away_team_name_en);
    const homeScore = status === 'SCHEDULED' ? null : toInt(g.home_score);
    const awayScore = status === 'SCHEDULED' ? null : toInt(g.away_score);

    // Quem avançou num empate: pênaltis, ou winner_team_id se a API mandar
    let winner: 'HOME' | 'AWAY' | null = null;
    if (status === 'FINISHED' && homeScore != null && homeScore === awayScore) {
      const penH = toInt(g.home_penalty_score);
      const penA = toInt(g.away_penalty_score);
      if (penH != null && penA != null && penH !== penA) {
        winner = penH > penA ? 'HOME' : 'AWAY';
      } else if (g.winner_team_id && g.winner_team_id !== '0') {
        if (g.winner_team_id === g.home_team_id) winner = 'HOME';
        else if (g.winner_team_id === g.away_team_id) winner = 'AWAY';
      }
    }

    const kickoff = parseKickoff(g.local_date);

    await sql`INSERT INTO matches (slot, api_match_id, home_name, away_name, home_crest, away_crest,
        home_score, away_score, winner, status, kickoff, kickoff_label)
      VALUES (${slot}, ${SLOT_TO_GAME[slot]}, ${homeName}, ${awayName},
        ${teamFlag(g.home_team_id)}, ${teamFlag(g.away_team_id)},
        ${homeScore}, ${awayScore}, ${winner}, ${status}, ${kickoff.iso}, ${kickoff.label})
      ON CONFLICT (slot) DO UPDATE SET
        api_match_id = EXCLUDED.api_match_id,
        home_name = COALESCE(EXCLUDED.home_name, matches.home_name),
        away_name = COALESCE(EXCLUDED.away_name, matches.away_name),
        home_crest = COALESCE(EXCLUDED.home_crest, matches.home_crest),
        away_crest = COALESCE(EXCLUDED.away_crest, matches.away_crest),
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        winner = COALESCE(EXCLUDED.winner, matches.winner),
        status = EXCLUDED.status,
        kickoff = COALESCE(EXCLUDED.kickoff, matches.kickoff),
        kickoff_label = COALESCE(EXCLUDED.kickoff_label, matches.kickoff_label)`;
    updated++;
  }

  return { ok: true, message: `Sincronizado: ${updated} jogo(s) atualizados.`, updated };
}

/**
 * Sincroniza quando alguém abre o site: a cada 1 min se houver jogo ao vivo
 * ou próximo; a cada 30 min fora disso (para pegar horários/chaveamento).
 */
export async function maybeSync(): Promise<void> {
  try {
    const last = await getSetting<string | null>('last_sync', null);
    const age = last ? Date.now() - new Date(last).getTime() : Infinity;
    if (age < 60_000) return;

    const sql = getSql();
    const rows = await sql`SELECT count(*)::int AS n FROM matches WHERE status = 'LIVE'
      OR (status = 'SCHEDULED' AND kickoff IS NOT NULL AND kickoff BETWEEN now() - interval '8 hours' AND now() + interval '8 hours')`;
    const hasActivity = (rows[0]?.n ?? 0) > 0;
    const total = ((await sql`SELECT count(*)::int AS n FROM matches`)[0]?.n ?? 0);

    if (total === 0 || hasActivity || age > 30 * 60_000) {
      await syncMatches(false);
    }
  } catch (e) {
    console.error('maybeSync falhou:', e);
  }
}
