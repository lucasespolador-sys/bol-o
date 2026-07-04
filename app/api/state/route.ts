import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, getSetting, getSql } from '@/lib/db';
import { maybeSync } from '@/lib/sync';
import { verifyToken } from '@/lib/auth';
import { scoreParticipant } from '@/lib/scoring';
import { DEFAULT_SCORING, Match, Picks, ScoringConfig, Slot } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Estado completo do bolão: jogos, ranking, palpites (após o fechamento).
export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    await maybeSync();

    const sql = getSql();
    const [matchRows, participantRows, predictionRows] = await Promise.all([
      sql`SELECT * FROM matches`,
      sql`SELECT id, name FROM participants ORDER BY name`,
      sql`SELECT participant_id, slot, home_score, away_score, winner FROM predictions`,
    ]);

    const matches: Partial<Record<Slot, Match>> = {};
    for (const r of matchRows) matches[r.slot as Slot] = r as unknown as Match;

    const scoring = await getSetting<ScoringConfig>('scoring', DEFAULT_SCORING);
    const lockSetting = await getSetting<string | null>('lock_at', null);
    const lastSync = await getSetting<string | null>('last_sync', null);

    // Fechamento dos palpites: data configurada na Central ou, por padrão,
    // o horário do primeiro jogo das oitavas.
    let lockAt = lockSetting;
    if (!lockAt) {
      const kicks = (['R16_1','R16_2','R16_3','R16_4','R16_5','R16_6','R16_7','R16_8'] as Slot[])
        .map((s) => matches[s]?.kickoff)
        .filter(Boolean)
        .map((k) => new Date(k as any).getTime());
      if (kicks.length === 8) lockAt = new Date(Math.min(...kicks)).toISOString();
    }
    const locked = !!lockAt && Date.now() >= new Date(lockAt).getTime();

    const picksByParticipant = new Map<string, Picks>();
    for (const r of predictionRows) {
      const p = picksByParticipant.get(r.participant_id) ?? {};
      p[r.slot as Slot] = { home_score: r.home_score, away_score: r.away_score, winner: r.winner };
      picksByParticipant.set(r.participant_id, p);
    }

    const meId = verifyToken(req.headers.get('authorization'));

    const leaderboard = participantRows.map((p) => {
      const picks = picksByParticipant.get(p.id) ?? {};
      const score = scoreParticipant(picks, matches, scoring);
      const exactCount = Object.values(score.slots).filter((s) => s.kind === 'exact').length;
      return {
        id: p.id,
        name: p.name,
        hasPicks: Object.keys(picks).length > 0,
        matchPoints: score.matchPoints,
        bonusPoints: score.bonus.points,
        bonus: score.bonus,
        total: score.total,
        exactCount,
      };
    }).sort((a, b) => b.total - a.total || b.exactCount - a.exactCount || a.name.localeCompare(b.name));

    // Detalhe dos palpites de todo mundo: só depois do fechamento
    const board = locked
      ? participantRows.map((p) => {
        const picks = picksByParticipant.get(p.id) ?? {};
        const score = scoreParticipant(picks, matches, scoring);
        return { id: p.id, name: p.name, picks, slots: score.slots, predTeams: score.predTeams };
      })
      : null;

    const me = meId
      ? {
        id: meId,
        name: participantRows.find((p) => p.id === meId)?.name ?? null,
        picks: picksByParticipant.get(meId) ?? {},
      }
      : null;

    return NextResponse.json({ matches, scoring, lockAt, locked, lastSync, leaderboard, board, me });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro inesperado' }, { status: 500 });
  }
}
