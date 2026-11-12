import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || 
  (process.env.DATABASE_URL || '');

const sql = neon(databaseUrl);

async function runMigration() {
  console.log('Connecting to Neon PostgreSQL to create kyc_documents table...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS kyc_documents (
      id VARCHAR PRIMARY KEY,
      member_id VARCHAR NOT NULL,
      doc_key VARCHAR NOT NULL,
      file_name VARCHAR,
      file_type VARCHAR,
      file_size VARCHAR,
      data_url TEXT NOT NULL,
      status VARCHAR DEFAULT 'under_review',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_member_doc UNIQUE (member_id, doc_key)
    );
  `;

  console.log('Creating index on kyc_documents (member_id, doc_key)...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_kyc_docs_member_doc ON kyc_documents (member_id, doc_key);
  `;

  // Verify table exists
  const count = await sql`SELECT count(*) FROM kyc_documents;`;
  console.log('kyc_documents table verified! Current record count:', count[0].count);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
