import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
const sql = neon(match[1].trim());

async function clean() {
  console.log('Cleaning test/hardcoded records from Neon DB...');

  // 1. Delete test member rahul and any other test members
  await sql`
    DELETE FROM members 
    WHERE id = 'mem_rahul' OR id LIKE 'test_%';
  `;

  // 2. Delete test transactions (Level 1, Level 2, Level 3 tests)
  await sql`
    DELETE FROM transactions 
    WHERE description LIKE '%Sneha%' OR description LIKE '%Vikash%' OR member_id = 'mem_rahul';
  `;

  // 3. Reset root partner balance and earnings to 0
  await sql`
    UPDATE members 
    SET 
      wallet_balance = 0,
      total_earnings = 0
    WHERE id = 'mem_matru';
  `;

  // 4. Delete dummy activations if any exist for test users
  try {
    await sql`
      DELETE FROM activations
      WHERE member_id = 'mem_rahul' OR member_name LIKE '%Rahul%' OR member_name LIKE '%Sneha%';
    `;
  } catch (e) {
    console.log('No activations table to clean or already clean');
  }

  // 5. Clean test transactions on mem_matru so transaction history is clean
  await sql`
    DELETE FROM transactions 
    WHERE member_id = 'mem_matru';
  `;

  // 6. Delete test orders
  await sql`
    DELETE FROM orders 
    WHERE buyer_member_id = 'mem_rahul';
  `;

  console.log('✅ Neon DB successfully cleaned of dummy/hardcoded test data!');

  const remainingMembers = await sql`SELECT id, name, email, wallet_balance, total_earnings FROM members;`;
  console.log('Remaining members in DB:');
  console.table(remainingMembers);

  const remainingTxs = await sql`SELECT id, member_id, description, amount FROM transactions;`;
  console.log('Remaining transactions in DB:', remainingTxs.length);
}

clean().catch(console.error);
