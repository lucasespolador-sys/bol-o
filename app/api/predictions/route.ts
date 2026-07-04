import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, getSetting, getSql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Slot, SLOTS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Salva o quadro de palpites do participante logado (até o fechamento).
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

    // Fechamento: data configurada ou primeiro jogo das oitavas
    let lockAt = await getSetting<string | null>('lock_at', null);
    if (!lockAt) {
      const rows = await sql`SELECT min(kickoff) AS k FROM matches WHERE slot LIKE 'R16%' AND kickoff IS NOT NULL`;
      lockAt = rows[0]?.k ?? null;
    }
    if (lockAt && Date.now() >= new Date(lockAt).getTime()) {
      return NextResponse.json({ error: 'Palpites fechados — o mata-mata já começou!' }, { status: 403 });
    }

    const body = await req.json();
    const picks = body.picks ?? {};
    const validSlots = new Set<string>(SLOTS);
    const sanitized: { slot: Slot; home: number; away: number; winner: string | null }[] = [];

    for (const [slot, raw] of Object.entries(picks) as [string, any][]) {
      if (!validSlots.has(slot) || raw == null) continue;
      const home = Number(raw.home_score);
      const away = Number(raw.away_score);
      if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 30 || away > 30) continue;
      let winner: string | null = raw.winner === 'HOME' || raw.winner === 'AWAY' ? raw.winner : null;
      if (home !== away) winner = null; // só faz sentido no empate
      if (home === away && !winner) continue; // empate precisa de quem passa
      sanitized.push({ slot: slot as Slot, home, away, winner });
    }

    await sql`DELETE FROM predictions WHERE participant_id = ${participantId}`;
    for (const p of sanitized) {
      await sql`INSERT INTO predictions (participant_id, slot, home_score, away_score, winner)
        VALUES (${participantId}, ${p.slot}, ${p.home}, ${p.away}, ${p.winner})`;
    }

    return NextResponse.json({ ok: true, saved: sanitized.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro inesperado' }, { status: 500 });
  }
}
