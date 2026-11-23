// Removes only expired, incomplete ZEX link attempts. It cannot remove an active link.
import { transaction } from '../server/database.js';

const result = await transaction(async sql => {
  const before = await sql`SELECT count(*)::int AS count FROM zex_connect_attempts WHERE expires_at < NOW()`;
  await sql`DELETE FROM zex_connect_attempts WHERE expires_at < NOW()`;
  const after = await sql`SELECT count(*)::int AS count FROM zex_connect_attempts WHERE expires_at < NOW()`;
  return { removed_expired_attempts: before[0].count, remaining_expired_attempts: after[0].count };
}, { serialize: true });

console.log(JSON.stringify(result));
