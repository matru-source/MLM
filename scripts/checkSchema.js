import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
const sql = neon(databaseUrl);

async function check() {
  console.log('Inspecting Neon tables...');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Tables found:', tables.map(t => t.table_name));

  for (const t of tables) {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${t.table_name}
      ORDER BY ordinal_position;
    `;
    console.log(`\nTable ${t.table_name}:`);
    console.log(cols.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
  }
}

check().catch(console.error);
