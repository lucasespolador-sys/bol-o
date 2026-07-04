import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, getSql } from '@/lib/db';
import { hashPin, makeToken, verifyPin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Cadastro e login dos participantes (nome + PIN de 4+ dígitos)
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();
    const action = body.action as 'register' | 'login';
    const name = String(body.name ?? '').trim();
    const pin = String(body.pin ?? '').trim();

    if (name.length < 2 || name.length > 30) {
      return NextResponse.json({ error: 'Nome deve ter entre 2 e 30 letras.' }, { status: 400 });
    }
    if (pin.length < 4 || pin.length > 20) {
      return NextResponse.json({ error: 'O PIN deve ter pelo menos 4 dígitos.' }, { status: 400 });
    }

    const sql = getSql();
    const existing = await sql`SELECT id, name, pin_hash FROM participants WHERE lower(name) = lower(${name})`;

    if (action === 'register') {
      if (existing.length) {
        return NextResponse.json({ error: 'Já existe alguém com esse nome. Faça login ou escolha outro.' }, { status: 409 });
      }
      const rows = await sql`INSERT INTO participants (name, pin_hash) VALUES (${name}, ${hashPin(pin)}) RETURNING id, name`;
      const p = rows[0];
      return NextResponse.json({ token: makeToken(p.id), participant: { id: p.id, name: p.name } });
    }

    // login
    if (!existing.length || !verifyPin(pin, existing[0].pin_hash)) {
      return NextResponse.json({ error: 'Nome ou PIN incorretos.' }, { status: 401 });
    }
    const p = existing[0];
    return NextResponse.json({ token: makeToken(p.id), participant: { id: p.id, name: p.name } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro inesperado' }, { status: 500 });
  }
}
