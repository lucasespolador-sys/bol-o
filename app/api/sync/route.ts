import { NextRequest, NextResponse } from 'next/server';
import { syncMatches } from '@/lib/sync';
import { verifyAdminToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Chamado pelo cron da Vercel (diário) e pelo botão "Sincronizar" da Central.
export async function GET(req: NextRequest) {
  const force = verifyAdminToken(req.headers.get('authorization'));
  const result = await syncMatches(force);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
