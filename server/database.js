import { Pool, neonConfig } from '@neondatabase/serverless';
import { HttpError } from './security.js';

// Interactive transactions use one connection throughout and always close it.
export async function transaction(work, { serialize = false, poolFactory } = {}) {
  if (!process.env.DATABASE_URL && !poolFactory) throw new HttpError(503, 'Database is not configured');
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = poolFactory ? poolFactory() : new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Shared by activation, payouts, settlement and ZEX financial events.
    if (serialize) await client.query('SELECT pg_advisory_xact_lock(739201)');
    const sql = async (parts, ...values) => {
      const text = parts.reduce((result, part, i) => result + (i ? `$${i}` : '') + part, '');
      return (await client.query(text, values)).rows;
    };
    const result = await work(sql);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}
