import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, getSql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { derivePredictedTeams, quadroPredictedMatchup } from '@/lib/scoring';
import { Match, Picks, phaseOf, Slot, SLOTS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Palpites "jogo a jogo": a segunda chance de quem quebrou o chaveamento.
// Só vale DAS QUARTAS EM DIANTE e só para jogos cujo confronto o participante
// NÃO previu no quadro fixo (quem previu mantém o palpite do quadro).
// Cada jogo pode ser ajustado até o SEU horário.
export async function PUT(req: NextRequest) {
  try {
    await ensureSchema();
    const participantId = verifyToken(req.headers.get('authorization'));
    if (!participantId) {
      return NextResponse.json({ error: 'Faça login para salvar seus palpites.' }, { status: 401 });
    }

    const sql = getSql();
    const exists = await sql`SELECT id FROM participants WHERE id = ${participantId}`;
    if (!exists.length) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 401 });
    }

    const body = await req.json();
    const picks = body.picks ?? {};
    const validSlots = new Set<string>(SLOTS);

    const [matchRows, quadroRows] = await Promise.all([
      sql`SELECT * FROM matches`,
      sql`SELECT slot, home_score, away_score, winner FROM predictions WHERE participant_id = ${participantId}`,
    ]);
    const bySlot = new Map(matchRows.map((m: any) => [m.slot, m]));

    const matchMap: Partial<Record<Slot, Match>> = {};
    for (const m of matchRows) matchMap[m.slot as Slot] = m as unknown as Match;
    const quadro: Picks = {};
    for (const r of quadroRows) {
      quadro[r.slot as Slot] = { home_score: r.home_score, away_score: r.away_score, winner: r.winner };
    }
    const predTeams = derivePredictedTeams(quadro, matchMap);

    let saved = 0;
    const locked: string[] = [];

    for (const [slot, raw] of Object.entries(picks) as [string, any][]) {
      if (!validSlots.has(slot)) continue;

      // Oitavas: vale só o quadro. Quartas+: só quem NÃO previu o confronto
      // (ou previu mas deixou o placar em branco no quadro).
      if (phaseOf(slot as Slot) === 'R16'
        || (quadroPredictedMatchup(slot as Slot, predTeams, matchMap[slot as Slot]) && quadro[slot as Slot])) {
        locked.push(slot);
        continue;
      }

      const m = bySlot.get(slot);
      const started = !m || m.status !== 'SCHEDULED'
        || !m.kickoff || new Date(m.kickoff).getTime() <= Date.now();
      const teamsDefined = m?.home_name && m?.away_name;

      if (raw === null) {
        // limpar ajuste (volta a valer o quadro) — só se o jogo não começou
        if (started) { locked.push(slot); continue; }
        await sql`DELETE FROM match_picks WHERE participant_id = ${participantId} AND slot = ${slot}`;
        saved++;
        continue;
      }

      if (started || !teamsDefined) { locked.push(slot); continue; }

      const home = Number(raw.home_score);
      const away = Number(raw.away_score);
      if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 30 || away > 30) continue;
      let winner: string | null = raw.winner === 'HOME' || raw.winner === 'AWAY' ? raw.winner : null;
      if (home !== away) winner = null;
      if (home === away && !winner) continue;

      await sql`INSERT INTO match_picks (participant_id, slot, home_score, away_score, winner, updated_at)
        VALUES (${participantId}, ${slot as Slot}, ${home}, ${away}, ${winner}, now())
        ON CONFLICT (participant_id, slot) DO UPDATE SET
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          winner = EXCLUDED.winner,
          updated_at = now()`;
      saved++;
    }

    return NextResponse.json({ ok: true, saved, locked });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro inesperado' }, { status: 500 });
  }
}
