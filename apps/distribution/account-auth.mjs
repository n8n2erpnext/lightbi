import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const cleanEmail = (value) => String(value || '').trim().toLowerCase();
const tokenHash = (value, secret) => createHash('sha256').update(`${secret}:${value}`).digest('hex');
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || '')), b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
};
const scryptAsync = promisify(scrypt);
async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const derived = await scryptAsync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [algorithm,salt,expected]=String(stored||'').split('$');if(algorithm!=='scrypt'||!salt||!expected)return false;
  const actual=await passwordHash(password,salt);return safeEqual(actual,stored);
}

export async function createAccountAuth({ databaseUrl, redisUrl, sessionSecret, googleClientId, googleClientSecret, googleRedirectUrl, publicBaseUrl }) {
  if (!databaseUrl || !redisUrl || !sessionSecret || !publicBaseUrl) {
    return { enabled: false, close: async () => {} };
  }
  const googleEnabled = Boolean(googleClientId && googleClientSecret && googleRedirectUrl);
  const [{ Pool }, { createClient }] = await Promise.all([import('pg'), import('redis')]);
  const pool = new Pool({ connectionString: databaseUrl, max: 6, idleTimeoutMillis: 30_000 });
  const redis = createClient({ url: redisUrl });
  redis.on('error', () => {});
  await redis.connect();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lightbi_accounts (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, display_name TEXT, avatar_url TEXT,
      provider TEXT NOT NULL, provider_subject TEXT UNIQUE NOT NULL,
      password_hash TEXT, email_verified_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'active', disabled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE lightbi_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE lightbi_accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
    ALTER TABLE lightbi_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE lightbi_accounts ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS lightbi_account_identities (
      provider TEXT NOT NULL, subject TEXT NOT NULL, account_id TEXT NOT NULL REFERENCES lightbi_accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(provider,subject)
    );
    CREATE TABLE IF NOT EXISTS lightbi_entitlements (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES lightbi_accounts(id) ON DELETE CASCADE,
      tier TEXT NOT NULL, status TEXT NOT NULL, source_license_id TEXT UNIQUE,
      max_devices INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS lightbi_account_devices (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES lightbi_accounts(id) ON DELETE CASCADE,
      installation_hash TEXT UNIQUE NOT NULL, display_name TEXT, platform TEXT, app_version TEXT,
      status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS lightbi_account_sessions (
      token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES lightbi_accounts(id) ON DELETE CASCADE,
      device_id TEXT REFERENCES lightbi_account_devices(id) ON DELETE CASCADE, kind TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS lightbi_account_audit (
      id BIGSERIAL PRIMARY KEY, account_id TEXT, kind TEXT NOT NULL, subject_id TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS lightbi_account_sessions_account_idx ON lightbi_account_sessions(account_id,expires_at DESC);
    CREATE INDEX IF NOT EXISTS lightbi_devices_account_idx ON lightbi_account_devices(account_id,status);
  `);
  await pool.query(`INSERT INTO lightbi_account_identities(provider,subject,account_id)
    SELECT provider,provider_subject,id FROM lightbi_accounts ON CONFLICT(provider,subject) DO NOTHING`);

  const randomId = (prefix) => `${prefix}_${randomBytes(16).toString('hex')}`;
  const audit = async (accountId, kind, subjectId = null, metadata = {}) => {
    await pool.query('INSERT INTO lightbi_account_audit(account_id,kind,subject_id,metadata) VALUES($1,$2,$3,$4)', [accountId, kind, subjectId, JSON.stringify(metadata)]);
  };

  async function activeEntitlement(accountId) {
    const result = await pool.query(`SELECT id,tier,status,max_devices,expires_at,source_license_id FROM lightbi_entitlements
      WHERE account_id=$1 AND status='active' AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY created_at DESC LIMIT 1`, [accountId]);
    return result.rows[0] || null;
  }

  async function createSession(accountId, kind, deviceId = null) {
    const token = randomBytes(32).toString('base64url');
    const days = kind === 'native' ? 30 : 1;
    await pool.query(`INSERT INTO lightbi_account_sessions(token_hash,account_id,device_id,kind,expires_at)
      VALUES($1,$2,$3,$4,NOW()+($5::int*INTERVAL '1 day'))`, [tokenHash(token, sessionSecret), accountId, deviceId, kind, days]);
    return token;
  }

  async function session(token) {
    if (!token) return null;
    const result = await pool.query(`SELECT s.account_id,s.device_id,s.kind,a.email,a.display_name,a.avatar_url
      FROM lightbi_account_sessions s JOIN lightbi_accounts a ON a.id=s.account_id
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>NOW() AND a.status='active'`, [tokenHash(token, sessionSecret)]);
    return result.rows[0] || null;
  }

  async function ensureDevice(accountId, installationHash, metadata = {}) {
    const existing = await pool.query('SELECT * FROM lightbi_account_devices WHERE installation_hash=$1', [installationHash]);
    if (existing.rows[0] && existing.rows[0].account_id !== accountId) throw new Error('device_already_owned');
    if (!existing.rows[0] || existing.rows[0].status !== 'active') {
      const entitlement = await activeEntitlement(accountId);
      const maxDevices = Number(entitlement?.max_devices || 1);
      const active = await pool.query("SELECT COUNT(*)::int AS count FROM lightbi_account_devices WHERE account_id=$1 AND status='active'", [accountId]);
      if (Number(active.rows[0]?.count || 0) >= maxDevices) throw new Error('device_limit_reached');
    }
    const id = existing.rows[0]?.id || randomId('dev');
    await pool.query(`INSERT INTO lightbi_account_devices(id,account_id,installation_hash,display_name,platform,app_version,status)
      VALUES($1,$2,$3,$4,$5,$6,'active') ON CONFLICT(installation_hash) DO UPDATE SET
      display_name=EXCLUDED.display_name,platform=EXCLUDED.platform,app_version=EXCLUDED.app_version,status='active',revoked_at=NULL,last_seen_at=NOW()`,
    [id, accountId, installationHash, String(metadata.displayName || 'LightBI device').slice(0,80), String(metadata.platform || '').slice(0,40), String(metadata.appVersion || '').slice(0,40)]);
    return id;
  }

  async function beginGoogle({ returnTo = '/account', nativeLoginId = null, installationHash = null, device = {} } = {}) {
    if (!googleEnabled) throw new Error('google_auth_unavailable');
    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    await redis.set(`lightbi:oauth:${state}`, JSON.stringify({ verifier, returnTo, nativeLoginId, installationHash, device }), { EX: 600 });
    const params = new URLSearchParams({ client_id: googleClientId, redirect_uri: googleRedirectUrl, response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' });
    return { authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, state };
  }

  async function finishGoogle({ code, state, cookieState }) {
    if (!code || !state || !safeEqual(state, cookieState)) throw new Error('oauth_state_invalid');
    const key = `lightbi:oauth:${state}`;
    const pendingRaw = await redis.get(key);
    await redis.del(key);
    if (!pendingRaw) throw new Error('oauth_state_expired');
    const pending = JSON.parse(pendingRaw);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: googleClientId, client_secret: googleClientSecret, redirect_uri: googleRedirectUrl, grant_type: 'authorization_code', code_verifier: pending.verifier }) });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.id_token) throw new Error('google_token_exchange_failed');
    const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`);
    const info = await infoResponse.json();
    if (!infoResponse.ok || info.aud !== googleClientId || info.email_verified !== 'true' || !info.sub || !cleanEmail(info.email)) throw new Error('google_identity_invalid');
    const email = cleanEmail(info.email);
    let account = await pool.query(`SELECT a.id FROM lightbi_account_identities i JOIN lightbi_accounts a ON a.id=i.account_id WHERE i.provider='google' AND i.subject=$1`, [info.sub]);
    if(!account.rows[0])account=await pool.query('SELECT id FROM lightbi_accounts WHERE email=$1',[email]);
    const accountId = account.rows[0]?.id || randomId('acct');
    if(account.rows[0]){const state=await pool.query('SELECT status FROM lightbi_accounts WHERE id=$1',[accountId]);if(state.rows[0]?.status!=='active')throw new Error('account_disabled');}
    await pool.query(`INSERT INTO lightbi_accounts(id,email,display_name,avatar_url,provider,provider_subject)
      VALUES($1,$2,$3,$4,'google',$5) ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_url=EXCLUDED.avatar_url,email_verified_at=COALESCE(lightbi_accounts.email_verified_at,NOW()),updated_at=NOW()`,
    [accountId, email, String(info.name || '').slice(0,120), String(info.picture || '').slice(0,500), info.sub]);
    await pool.query("UPDATE lightbi_accounts SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1",[accountId]);
    await pool.query("INSERT INTO lightbi_account_identities(provider,subject,account_id) VALUES('google',$1,$2) ON CONFLICT(provider,subject) DO NOTHING",[info.sub,accountId]);
    await audit(accountId, account.rows[0] ? 'account_login_google' : 'account_created_google');
    if (pending.nativeLoginId) {
      const nativeKey = `lightbi:native-login:${pending.nativeLoginId}`;
      const nativeRaw = await redis.get(nativeKey);
      if (!nativeRaw) throw new Error('native_login_expired');
      const native = JSON.parse(nativeRaw);
      if (!safeEqual(native.installationHash, pending.installationHash)) throw new Error('native_login_mismatch');
      await redis.set(nativeKey, JSON.stringify({ ...native, accountId, status: 'complete', device: pending.device }), { EX: 600 });
      return { native: true, returnTo: pending.returnTo || '/account?native=connected' };
    }
    return { native: false, token: await createSession(accountId, 'web'), returnTo: pending.returnTo || '/account' };
  }

  async function startNativeLogin({ installationHash, device }) {
    const loginId = randomId('login');
    await redis.set(`lightbi:native-login:${loginId}`, JSON.stringify({ installationHash, status: 'pending' }), { EX: 600 });
    const google = await beginGoogle({ returnTo: '/account?native=connected', nativeLoginId: loginId, installationHash, device });
    return { loginId, authorizationUrl: google.authorizationUrl, expiresIn: 600 };
  }

  async function issueEmailToken(kind,payload) {
    const token=randomBytes(32).toString('base64url');
    await redis.set(`lightbi:account:${kind}:${tokenHash(token,sessionSecret)}`,JSON.stringify(payload),{EX:kind==='verify'?1800:900});
    return token;
  }

  async function emailActionAllowed(kind, identity, maximum = 5, seconds = 900) {
    const key = `lightbi:account:${kind}-limit:${tokenHash(String(identity || 'network'), sessionSecret)}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, seconds);
    return attempts <= maximum;
  }

  async function registerEmail({email,password,displayName,sendVerification,networkHash=null}) {
    const normalized=cleanEmail(email);
    if(!/^\S+@\S+\.\S+$/.test(normalized)||String(password||'').length<12)throw new Error('invalid_registration');
    if(!await emailActionAllowed('register',`${networkHash||'network'}:${normalized}`,5,900))throw new Error('rate_limited');
    let account=await pool.query('SELECT id FROM lightbi_accounts WHERE email=$1',[normalized]);
    const accountId=account.rows[0]?.id||randomId('acct');
    const hash=await passwordHash(password);
    await pool.query(`INSERT INTO lightbi_accounts(id,email,display_name,provider,provider_subject)
      VALUES($1,$2,$3,'password',$2) ON CONFLICT(email) DO NOTHING`,[accountId,normalized,String(displayName||'').slice(0,120)]);
    const token=await issueEmailToken('verify',{email:normalized,passwordHash:hash,displayName:String(displayName||'').slice(0,120)});await sendVerification({to:normalized,verifyUrl:`${publicBaseUrl}/distribution-api/api/account/verify?token=${encodeURIComponent(token)}`});
    await audit(accountId,'account_registered_email');return {accepted:true};
  }

  async function verifyEmailToken(token) {
    const key=`lightbi:account:verify:${tokenHash(String(token||''),sessionSecret)}`;const raw=await redis.get(key);if(!raw)return null;await redis.del(key);
    let pending;try{pending=JSON.parse(raw);}catch{return null;}
    const email=cleanEmail(pending.email);if(!email||!pending.passwordHash)return null;
    const result=await pool.query(`UPDATE lightbi_accounts SET password_hash=$2,email_verified_at=COALESCE(email_verified_at,NOW()),
      display_name=COALESCE(NULLIF($3,''),display_name),updated_at=NOW() WHERE email=$1 AND status='active' RETURNING id`,[email,pending.passwordHash,String(pending.displayName||'').slice(0,120)]);
    if(!result.rows[0])return null;
    await pool.query("INSERT INTO lightbi_account_identities(provider,subject,account_id) VALUES('password',$1,$2) ON CONFLICT(provider,subject) DO NOTHING",[email,result.rows[0].id]);
    await audit(result.rows[0].id,'account_email_verified');return createSession(result.rows[0].id,'web');
  }

  async function loginEmail({email,password,installationHash=null,device={},networkHash=null}) {
    const normalized=cleanEmail(email);const rateKey=`lightbi:account:login-limit:${tokenHash(`${networkHash||'network'}:${normalized}`,sessionSecret)}`;
    const attempts=await redis.incr(rateKey);if(attempts===1)await redis.expire(rateKey,900);if(attempts>8)throw new Error('rate_limited');
    const result=await pool.query('SELECT id,password_hash,email_verified_at,status FROM lightbi_accounts WHERE email=$1',[normalized]);const account=result.rows[0];
    if(!account||account.status!=='active'||!account.email_verified_at||!await verifyPassword(password,account.password_hash))throw new Error('invalid_credentials');
    await redis.del(rateKey);let deviceId=null;if(installationHash)deviceId=await ensureDevice(account.id,installationHash,device);
    await audit(account.id,'account_login_email',deviceId);return {token:await createSession(account.id,installationHash?'native':'web',deviceId),accountId:account.id};
  }

  async function requestPasswordReset(email,sendReset,networkHash=null) {
    const normalized=cleanEmail(email);const result=await pool.query('SELECT id FROM lightbi_accounts WHERE email=$1 AND password_hash IS NOT NULL',[normalized]);if(!result.rows[0])return;
    if(!await emailActionAllowed('password-reset',`${networkHash||'network'}:${normalized}`,4,900))return;
    const token=await issueEmailToken('reset',{email:normalized});await sendReset({to:normalized,resetUrl:`${publicBaseUrl}/account?reset=${encodeURIComponent(token)}`});
  }

  async function resetPassword(token,password) {
    if(String(password||'').length<12)return false;const key=`lightbi:account:reset:${tokenHash(String(token||''),sessionSecret)}`;const raw=await redis.get(key);if(!raw)return false;await redis.del(key);
    let pending;try{pending=JSON.parse(raw);}catch{return false;}const email=cleanEmail(pending.email);if(!email)return false;
    const hash=await passwordHash(password);const result=await pool.query('UPDATE lightbi_accounts SET password_hash=$2,updated_at=NOW() WHERE email=$1 RETURNING id',[email,hash]);if(!result.rows[0])return false;
    await pool.query('UPDATE lightbi_account_sessions SET revoked_at=NOW() WHERE account_id=$1',[result.rows[0].id]);await audit(result.rows[0].id,'account_password_reset');return true;
  }

  async function finishNativeLogin({ loginId, installationHash }) {
    const key = `lightbi:native-login:${loginId}`;
    const raw = await redis.get(key);
    if (!raw) return { status: 'expired' };
    const pending = JSON.parse(raw);
    if (!safeEqual(pending.installationHash, installationHash)) return { status: 'denied' };
    if (pending.status !== 'complete' || !pending.accountId) return { status: 'pending' };
    const deviceId = await ensureDevice(pending.accountId, installationHash, pending.device);
    const token = await createSession(pending.accountId, 'native', deviceId);
    await redis.del(key);
    await audit(pending.accountId, 'device_activated', deviceId, { platform: pending.device?.platform || null });
    return { status: 'complete', token };
  }

  async function accountSummary(accountId) {
    const [account, entitlement, devices] = await Promise.all([
      pool.query('SELECT id,email,display_name,avatar_url,provider,status,created_at FROM lightbi_accounts WHERE id=$1', [accountId]),
      activeEntitlement(accountId),
      pool.query('SELECT id,display_name,platform,app_version,status,created_at,last_seen_at,revoked_at FROM lightbi_account_devices WHERE account_id=$1 ORDER BY last_seen_at DESC', [accountId]),
    ]);
    if (!account.rows[0]) return null;
    return { account: account.rows[0], entitlement: entitlement || { tier: 'basic', status: 'active', max_devices: 1, expires_at: null }, devices: devices.rows };
  }

  async function grantLicense(accountId, license, installationHash = null, device = {}) {
    const id = randomId('ent');
    await pool.query(`INSERT INTO lightbi_entitlements(id,account_id,tier,status,source_license_id,max_devices,expires_at)
      VALUES($1,$2,'pro','active',$3,$4,$5) ON CONFLICT(source_license_id) DO NOTHING`, [id, accountId, license.id, license.max_devices, license.expires_at]);
    const owner = await pool.query('SELECT account_id FROM lightbi_entitlements WHERE source_license_id=$1', [license.id]);
    if (owner.rows[0]?.account_id !== accountId) throw new Error('license_already_redeemed');
    if (installationHash) await ensureDevice(accountId, installationHash, device);
    await audit(accountId, 'license_redeemed', license.id, { maxDevices: license.max_devices, expiresAt: license.expires_at || null });
    return accountSummary(accountId);
  }

  async function revokeDevice(accountId, deviceId) {
    const changed = await pool.query("UPDATE lightbi_account_devices SET status='revoked',revoked_at=NOW() WHERE id=$1 AND account_id=$2 AND status='active'", [deviceId, accountId]);
    if (!changed.rowCount) return false;
    await pool.query('UPDATE lightbi_account_sessions SET revoked_at=NOW() WHERE device_id=$1', [deviceId]);
    await audit(accountId, 'device_revoked', deviceId);
    return true;
  }

  async function revokeLicenseEntitlement(licenseId) {
    const rows = await pool.query("UPDATE lightbi_entitlements SET status='revoked',updated_at=NOW() WHERE source_license_id=$1 AND status='active' RETURNING account_id,id", [licenseId]);
    for (const row of rows.rows) await audit(row.account_id, 'entitlement_revoked', row.id, { licenseId });
  }

  async function replaceLicenseEntitlement(previousLicenseId, replacementLicense) {
    const rows = await pool.query(`UPDATE lightbi_entitlements SET source_license_id=$2,status='active',max_devices=$3,expires_at=$4,updated_at=NOW()
      WHERE source_license_id=$1 RETURNING account_id,id`, [previousLicenseId, replacementLicense.id, replacementLicense.max_devices, replacementLicense.expires_at]);
    for (const row of rows.rows) await audit(row.account_id, 'license_rotated', row.id, { previousLicenseId, replacementLicenseId: replacementLicense.id });
  }

  async function listAccounts() {
    const result = await pool.query(`SELECT a.id,a.email,a.display_name,a.provider,a.status,a.disabled_at,a.created_at,a.updated_at,
      COALESCE(e.tier,'basic') AS tier,COALESCE(e.status,'active') AS entitlement_status,e.source_license_id,e.max_devices,e.expires_at,
      COALESCE(d.active_devices,0)::int AS active_devices
      FROM lightbi_accounts a LEFT JOIN LATERAL (SELECT * FROM lightbi_entitlements WHERE account_id=a.id ORDER BY created_at DESC LIMIT 1) e ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS active_devices FROM lightbi_account_devices WHERE account_id=a.id AND status='active') d ON TRUE
      ORDER BY a.created_at DESC LIMIT 500`);
    return result.rows;
  }

  async function revokeAccountEntitlement(accountId) {
    const rows = await pool.query("UPDATE lightbi_entitlements SET status='revoked',updated_at=NOW() WHERE account_id=$1 AND status='active' RETURNING id", [accountId]);
    for (const row of rows.rows) await audit(accountId, 'entitlement_revoked_admin', row.id);
    return rows.rowCount > 0;
  }

  async function setAccountStatus(accountId, status) {
    const next = status === 'disabled' ? 'disabled' : 'active';
    const result = await pool.query(`UPDATE lightbi_accounts SET status=$2,disabled_at=CASE WHEN $2='disabled' THEN NOW() ELSE NULL END,updated_at=NOW()
      WHERE id=$1 RETURNING id`, [accountId, next]);
    if (!result.rows[0]) return false;
    if (next === 'disabled') await pool.query('UPDATE lightbi_account_sessions SET revoked_at=NOW() WHERE account_id=$1 AND revoked_at IS NULL', [accountId]);
    await audit(accountId, next === 'disabled' ? 'account_disabled_admin' : 'account_enabled_admin');
    return true;
  }

  async function revokeAccountSessions(accountId) {
    const account = await pool.query('SELECT id FROM lightbi_accounts WHERE id=$1', [accountId]);
    if (!account.rows[0]) return false;
    await pool.query('UPDATE lightbi_account_sessions SET revoked_at=NOW() WHERE account_id=$1 AND revoked_at IS NULL', [accountId]);
    await audit(accountId, 'account_sessions_revoked_admin');
    return true;
  }

  async function logout(token) {
    if (!token) return;
    await pool.query('UPDATE lightbi_account_sessions SET revoked_at=NOW() WHERE token_hash=$1', [tokenHash(token, sessionSecret)]);
  }

  return { enabled: true, googleEnabled, beginGoogle, finishGoogle, startNativeLogin, finishNativeLogin, registerEmail, verifyEmailToken, loginEmail, requestPasswordReset, resetPassword, session, accountSummary, grantLicense, revokeDevice, revokeLicenseEntitlement, replaceLicenseEntitlement, listAccounts, revokeAccountEntitlement, setAccountStatus, revokeAccountSessions, logout, close: async () => { if (redis.isReady) await redis.quit(); await pool.end(); } };
}
