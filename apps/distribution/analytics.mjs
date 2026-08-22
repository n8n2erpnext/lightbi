import { createHash } from 'node:crypto';

const clean = (value, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) || null : null;
const allowedKinds = new Set(['page_view', 'download', 'install_pair', 'license_activation']);

export async function createDistributionAnalytics({ databaseUrl, redisUrl, pepper }) {
  if (!databaseUrl) return {
    enabled: false,
    record: async () => {},
    summary: async () => ({ enabled: false }),
    close: async () => {},
  };

  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl, max: 6, idleTimeoutMillis: 30_000 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS distribution_events (
      id BIGSERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      visitor_hash TEXT,
      installation_hash TEXT,
      tier TEXT,
      app_version TEXT,
      platform TEXT,
      path TEXT,
      referrer_host TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      timezone TEXT,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE distribution_events ADD COLUMN IF NOT EXISTS timezone TEXT;
    CREATE INDEX IF NOT EXISTS distribution_events_time_idx ON distribution_events (occurred_at DESC);
    CREATE INDEX IF NOT EXISTS distribution_events_kind_time_idx ON distribution_events (kind, occurred_at DESC);
    CREATE TABLE IF NOT EXISTS distribution_installations (
      installation_hash TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'basic',
      app_version TEXT,
      platform TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS distribution_daily_activity (
      installation_hash TEXT NOT NULL,
      activity_date DATE NOT NULL,
      tier TEXT NOT NULL,
      app_version TEXT,
      platform TEXT,
      PRIMARY KEY (installation_hash, activity_date)
    );
    CREATE TABLE IF NOT EXISTS distribution_unique_visits (
      visitor_hash TEXT NOT NULL,
      visit_date DATE NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (visitor_hash, visit_date)
    );
  `);

  let redis = null;
  if (redisUrl) {
    try {
      const { createClient } = await import('redis');
      redis = createClient({ url: redisUrl });
      redis.on('error', () => {});
      await redis.connect();
    } catch {
      redis = null;
    }
  }

  const hash = (value) => value ? createHash('sha256').update(`${pepper}:${value}`).digest('hex') : null;
  const invalidate = async () => {
    if (!redis?.isReady) return;
    const keys = await redis.keys('lightbi:distribution:summary:*');
    if (keys.length) await redis.del(keys);
  };

  async function record(input) {
    if (!allowedKinds.has(input.kind) || input.environment === 'test') return;
    const visitorHash = hash(clean(input.visitorId, 100));
    const installationHash = hash(clean(input.installationId, 100));
    const tier = input.tier === 'pro' ? 'pro' : 'basic';
    const values = [input.kind, visitorHash, installationHash, tier, clean(input.appVersion, 40), clean(input.platform, 60), clean(input.path, 200), clean(input.referrerHost, 120), clean(input.utmSource, 80), clean(input.utmMedium, 80), clean(input.utmCampaign, 120), clean(input.timezone, 80)];
    await pool.query(`INSERT INTO distribution_events
      (kind, visitor_hash, installation_hash, tier, app_version, platform, path, referrer_host, utm_source, utm_medium, utm_campaign, timezone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, values);
    if (input.kind === 'page_view' && visitorHash) {
      await pool.query(`INSERT INTO distribution_unique_visits (visitor_hash, visit_date) VALUES ($1, CURRENT_DATE)
        ON CONFLICT (visitor_hash, visit_date) DO NOTHING`, [visitorHash]);
    }
    if ((input.kind === 'install_pair' || input.kind === 'license_activation') && installationHash) {
      await pool.query(`INSERT INTO distribution_installations (installation_hash, tier, app_version, platform, first_seen_at, last_seen_at)
        VALUES ($1,$2,$3,$4,NOW(),NOW()) ON CONFLICT (installation_hash) DO UPDATE
        SET tier=EXCLUDED.tier, app_version=EXCLUDED.app_version, platform=EXCLUDED.platform, last_seen_at=NOW()`,
      [installationHash, tier, clean(input.appVersion, 40), clean(input.platform, 60)]);
      await pool.query(`INSERT INTO distribution_daily_activity (installation_hash, activity_date, tier, app_version, platform)
        VALUES ($1,CURRENT_DATE,$2,$3,$4) ON CONFLICT (installation_hash, activity_date) DO UPDATE
        SET tier=EXCLUDED.tier, app_version=EXCLUDED.app_version, platform=EXCLUDED.platform`,
      [installationHash, tier, clean(input.appVersion, 40), clean(input.platform, 60)]);
    }
    await invalidate();
  }

  async function summary(days = 30) {
    const windowDays = Math.min(365, Math.max(1, Number(days) || 30));
    const cacheKey = `lightbi:distribution:summary:${windowDays}`;
    const cached = redis?.isReady ? await redis.get(cacheKey) : null;
    if (cached) return JSON.parse(cached);
    const [totals, daily, campaigns, platforms, versions, timezones] = await Promise.all([
      pool.query(`SELECT
        (SELECT COUNT(*) FROM distribution_events WHERE kind='page_view')::int AS page_views,
        (SELECT COUNT(DISTINCT visitor_hash) FROM distribution_events WHERE kind='page_view' AND visitor_hash IS NOT NULL)::int AS unique_visitors,
        (SELECT COUNT(*) FROM distribution_events WHERE kind='download')::int AS downloads,
        (SELECT COUNT(*) FROM distribution_installations WHERE tier='basic')::int AS basic_installs,
        (SELECT COUNT(*) FROM distribution_installations WHERE tier='pro')::int AS pro_installs,
        (SELECT COUNT(*) FROM distribution_daily_activity WHERE activity_date=CURRENT_DATE)::int AS daily_active`),
      pool.query(`WITH days AS (SELECT generate_series(CURRENT_DATE-($1::int-1),CURRENT_DATE,'1 day')::date AS day)
        SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS day,
          COUNT(e.id) FILTER (WHERE e.kind='page_view')::int AS page_views,
          COUNT(DISTINCT e.visitor_hash) FILTER (WHERE e.kind='page_view')::int AS unique_visitors,
          COUNT(e.id) FILTER (WHERE e.kind='download')::int AS downloads,
          COUNT(DISTINCT a.installation_hash)::int AS active_machines
        FROM days LEFT JOIN distribution_events e ON e.occurred_at::date=days.day
        LEFT JOIN distribution_daily_activity a ON a.activity_date=days.day GROUP BY days.day ORDER BY days.day`, [windowDays]),
      pool.query(`SELECT COALESCE(utm_campaign,utm_source,'Direct / unknown') AS campaign,
        COUNT(*) FILTER (WHERE kind='page_view')::int AS visits,
        COUNT(*) FILTER (WHERE kind='download')::int AS downloads
        FROM distribution_events WHERE occurred_at >= NOW()-($1::int*INTERVAL '1 day')
        GROUP BY 1 ORDER BY visits DESC, downloads DESC LIMIT 12`, [windowDays]),
      pool.query(`SELECT COALESCE(platform,'unknown') AS label, COUNT(*)::int AS value FROM distribution_installations GROUP BY 1 ORDER BY value DESC LIMIT 12`),
      pool.query(`SELECT COALESCE(app_version,'unknown') AS label, COUNT(*)::int AS value FROM distribution_installations GROUP BY 1 ORDER BY value DESC LIMIT 12`),
      pool.query(`SELECT COALESCE(timezone,'Unknown') AS label, COUNT(DISTINCT visitor_hash)::int AS value
        FROM distribution_events WHERE kind='page_view' AND occurred_at >= NOW()-($1::int*INTERVAL '1 day')
        GROUP BY 1 ORDER BY value DESC LIMIT 12`, [windowDays]),
    ]);
    const result = { enabled: true, cache: redis?.isReady ? 'redis' : 'none', days: windowDays, totals: totals.rows[0], daily: daily.rows, campaigns: campaigns.rows, platforms: platforms.rows, versions: versions.rows, timezones: timezones.rows };
    if (redis?.isReady) await redis.set(cacheKey, JSON.stringify(result), { EX: 30 });
    return result;
  }

  return { enabled: true, record, summary, close: async () => { if (redis?.isReady) await redis.quit(); await pool.end(); } };
}
