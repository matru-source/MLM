import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
const sql = neon(match[1].trim());

async function run() {
  const orders = await sql`SELECT * FROM orders;`;
  console.log('--- ORDERS IN DB (' + orders.length + ') ---');
  console.log(orders);
}

run().catch(console.error);
