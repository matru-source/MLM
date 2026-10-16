import { neon } from '@neondatabase/serverless';

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {}
}

const dbUrl = process.env.DATABASE_URL;
console.log('Database URL exists:', Boolean(dbUrl));

if (dbUrl) {
  try {
    const sql = neon(dbUrl);
    const rows = await sql`SELECT count(*) as count FROM members;`;
    console.log('🎉 Neon PostgreSQL connection SUCCESSFUL! Total members in Neon DB:', rows[0].count);
    
    // Check tables
    const activations = await sql`SELECT count(*) as count FROM activations;`;
    console.log('Total activations in DB:', activations[0].count);

    const payouts = await sql`SELECT count(*) as count FROM payouts;`;
    console.log('Total payouts in DB:', payouts[0].count);

    const orders = await sql`SELECT count(*) as count FROM orders;`;
    console.log('Total orders in DB:', orders[0].count);
  } catch (err) {
    console.error('Database connection error:', err.message);
  }
}
