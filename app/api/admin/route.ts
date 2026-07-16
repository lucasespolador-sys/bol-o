import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, getSetting, getSql, setSetting } from '@/lib/db';
import { checkAdminPin, hashPin, makeAdminToken, verifyAdminToken } from '@/lib/auth';
import { syncMatches } from '@/lib/sync';
import { DEFAULT_SCORING, ScoringConfig, SLOTS } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// Ações administrativas da aba Central (protegidas pelo ADMIN_PIN).
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();
    const action = String(body.action ?? '');

    if (action === 'login') {
      if (!checkAdminPin(String(body.pin ?? ''))) return bad('Senha de administrador incorreta.', 401);
      return NextResponse.json({ token: makeAdminToken() });
    }

    if (!verifyAdminToken(req.headers.get('authorization'))) {
      return bad('Acesso restrito ao administrador.', 401);
    }

    const sql = getSql();

    switch (action) {
      case 'settings_get': {
        const scoring = await getSetting<ScoringConfig>('scoring', DEFAULT_SCORING);
        const lockAt = await getSetting<string | null>('lock_at', null);
        const lastSync = await getSetting<string | null>('last_sync', null);
        return NextResponse.json({ scoring, lockAt, lastSync });
      }

      case 'scoring_save': {
        const s = body.scoring ?? {};
        const num = (v: any, fb: number) => (Number.isFinite(Number(v)) ? Number(v) : fb);
        const d = DEFAULT_SCORING;
        const scoring: ScoringConfig = {
          exact: num(s.exact, d.exact),
          diff: num(s.diff, d.diff),
          winner: num(s.winner, d.winner),
          multipliers: {
            R16: num(s.multipliers?.R16, d.multipliers.R16),
            QF: num(s.multipliers?.QF, d.multipliers.QF),
            SF: num(s.multipliers?.SF, d.multipliers.SF),
            TP: num(s.multipliers?.TP, d.multipliers.TP),
            F: num(s.multipliers?.F, d.multipliers.F),
          },
          bonus: {
            semifinalist: num(s.bonus?.semifinalist, d.bonus.semifinalist),
            finalist: num(s.bonus?.finalist, d.bonus.finalist),
            third: num(s.bonus?.third, d.bonus.third),
            champion: num(s.bonus?.champion, d.bonus.champion),
            thirdMatch: num(s.bonus?.thirdMatch, 0),
          },
        };
        await setSetting('scoring', scoring);
        return NextResponse.json({ ok: true, scoring });
      }

      case 'lock_save': {
        const lockAt = body.lockAt ? new Date(body.lockAt).toISOString() : null;
        await setSetting('lock_at', lockAt);
        return NextResponse.json({ ok: true, lockAt });
      }

      case 'match_save': {
        const slot = String(body.slot ?? '');
        if (!(SLOTS as readonly string[]).includes(slot)) return bad('Jogo inválido.');
        const toIntOrNull = (v: any) => {
          if (v === null || v === undefined || v === '') return null;
          const n = Number(v);
          return Number.isInteger(n) && n >= 0 && n <= 30 ? n : null;
        };
        const home_name = body.home_name ? String(body.home_name).trim() : null;
        const away_name = body.away_name ? String(body.away_name).trim() : null;
        const home_score = toIntOrNull(body.home_score);
        const away_score = toIntOrNull(body.away_score);
        const winner = body.winner === 'HOME' || body.winner === 'AWAY' ? body.winner : null;
        const status = ['SCHEDULED', 'LIVE', 'FINISHED'].includes(body.status) ? body.status : 'SCHEDULED';
        await sql`INSERT INTO matches (slot, home_name, away_name, home_score, away_score, winner, status)
          VALUES (${slot}, ${home_name}, ${away_name}, ${home_score}, ${away_score}, ${winner}, ${status})
          ON CONFLICT (slot) DO UPDATE SET
            home_name = EXCLUDED.home_name,
            away_name = EXCLUDED.away_name,
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            winner = EXCLUDED.winner,
            status = EXCLUDED.status`;
        return NextResponse.json({ ok: true });
      }

      case 'participants_list': {
        const rows = await sql`SELECT p.id, p.name, p.created_at,
            (SELECT count(*)::int FROM predictions pr WHERE pr.participant_id = p.id) AS picks
          FROM participants p ORDER BY p.name`;
        return NextResponse.json({ participants: rows });
      }

      case 'participant_delete': {
        await sql`DELETE FROM participants WHERE id = ${String(body.id ?? '')}`;
        return NextResponse.json({ ok: true });
      }

      case 'participant_reset_pin': {
        const pin = String(body.pin ?? '');
        if (pin.length < 4) return bad('O novo PIN deve ter pelo menos 4 dígitos.');
        await sql`UPDATE participants SET pin_hash = ${hashPin(pin)} WHERE id = ${String(body.id ?? '')}`;
        return NextResponse.json({ ok: true });
      }

      case 'sync': {
        const result = await syncMatches(true);
        return NextResponse.json(result, { status: result.ok ? 200 : 502 });
      }

      default:
        return bad(`Ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro inesperado' }, { status: 500 });
  }
}
