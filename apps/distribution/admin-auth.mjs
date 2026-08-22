import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [scheme, salt, expectedHex] = String(encoded || '').split(':');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createAdminAuth({ databaseUrl, redisUrl, sessionSecret }) {
  if (!databaseUrl || !redisUrl || !sessionSecret) return { enabled: false };
  const [{ Pool }, { createClient }] = await Promise.all([import('pg'), import('redis')]);
  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  await pool.query(`CREATE TABLE IF NOT EXISTS distribution_admins (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    password_rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const redis = createClient({ url: redisUrl });
  redis.on('error', () => {});
  await redis.connect();
  const tokenHash = (token) => createHmac('sha256', sessionSecret).update(token).digest('hex');

  async function upsertAdmin(email, password) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || password.length < 16) throw new Error('invalid_admin_credentials');
    const encoded = await passwordHash(password);
    await pool.query(`INSERT INTO distribution_admins (email,password_hash) VALUES ($1,$2)
      ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,password_rotated_at=NOW()`, [normalized, encoded]);
  }

  async function login(email, password, networkHash) {
    const normalized = String(email || '').trim().toLowerCase();
    const rateKey = `lightbi:admin:login:${networkHash || 'unknown'}`;
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) await redis.expire(rateKey, 900);
    if (attempts > 8) return { ok: false, reason: 'rate_limited' };
    const result = await pool.query('SELECT password_hash FROM distribution_admins WHERE email=$1', [normalized]);
    if (!result.rows[0] || !await verifyPassword(String(password || ''), result.rows[0].password_hash)) return { ok: false, reason: 'invalid_credentials' };
    await redis.del(rateKey);
    const token = randomBytes(32).toString('base64url');
    await redis.set(`lightbi:admin:session:${tokenHash(token)}`, JSON.stringify({ email: normalized, createdAt: new Date().toISOString() }), { EX: 43_200 });
    return { ok: true, token, email: normalized };
  }

  async function session(token) {
    if (!token) return null;
    const value = await redis.get(`lightbi:admin:session:${tokenHash(token)}`);
    return value ? JSON.parse(value) : null;
  }

  async function logout(token) {
    if (token) await redis.del(`lightbi:admin:session:${tokenHash(token)}`);
  }

  return { enabled: true, login, logout, session, upsertAdmin, close: async () => { if (redis.isReady) await redis.quit(); await pool.end(); } };
}
