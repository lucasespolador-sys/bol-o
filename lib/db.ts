import { Pool } from 'pg';

export function dbUrl(): string {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error(
      'Banco de dados não configurado. Na Vercel: Storage → Create Database → Neon (Postgres) → Connect Project.',
    );
  }
  return url;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = dbUrl();
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes('sslmode=disable');
    pool = new Pool({
      connectionString: url,
      max: 3,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

/** Template SQL parametrizado: sql`SELECT * FROM t WHERE id = ${id}` */
export function getSql(): SqlTag {
  const p = getPool();
  return async (strings, ...values) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    const res = await p.query(text, values as any[]);
    return res.rows;
  };
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`CREATE TABLE IF NOT EXISTS participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text UNIQUE NOT NULL,
        pin_hash text NOT NULL,
        is_admin boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS matches (
        slot text PRIMARY KEY,
        api_match_id bigint,
        home_name text,
        away_name text,
        home_crest text,
        away_crest text,
        home_score int,
        away_score int,
        winner text,
        status text NOT NULL DEFAULT 'SCHEDULED',
        kickoff timestamptz,
        kickoff_label text
      )`;
      await sql`CREATE TABLE IF NOT EXISTS predictions (
        participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        slot text NOT NULL,
        home_score int NOT NULL,
        away_score int NOT NULL,
        winner text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (participant_id, slot)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL
      )`;
    })().catch((e) => {
      schemaReady = null; // permite tentar de novo na próxima requisição
      throw e;
    });
  }
  return schemaReady;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const sql = getSql();
  const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return rows.length ? (rows[0].value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const sql = getSql();
  await sql`INSERT INTO settings (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}
