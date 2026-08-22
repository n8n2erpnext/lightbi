import { createAdminAuth } from './admin-auth.mjs';

const email = process.env.LIGHTBI_ADMIN_EMAIL;
const password = process.env.LIGHTBI_ADMIN_PASSWORD;
const auth = await createAdminAuth({ databaseUrl: process.env.DATABASE_URL, redisUrl: process.env.REDIS_URL, sessionSecret: process.env.LIGHTBI_ADMIN_SESSION_SECRET });
if (!auth.enabled || !email || !password) throw new Error('admin_creation_configuration_missing');
await auth.upsertAdmin(email, password);
await auth.close();
console.log(JSON.stringify({ created: true, email: email.toLowerCase() }));
