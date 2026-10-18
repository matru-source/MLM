import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || 
  Buffer.from('cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfckVnVEZDTHdEcTM2QGVwLWF1dHVtbi1tb2RlLWExdGp5bnNiLXBvb2xlci5hcC1zb3V0aGVhc3QtMS5hd3MubmVvbi50ZWNoL25lb25kYj9zc2xtb2RlPXJlcXVpcmUmY2hhbm5lbF9iaW5kaW5nPXJlcXVpcmU=', 'base64').toString('utf8');

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
