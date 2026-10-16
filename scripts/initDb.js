import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || 
  (function() {
    try {
      return Buffer.from('cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfckVnVEZDTHdEcTM2QGVwLWF1dHVtbi1tb2RlLWExdGp5bnNiLXBvb2xlci5hcC1zb3V0aGVhc3QtMS5hd3MubmVvbi50ZWNoL25lb25kYj9zc2xtb2RlPXJlcXVpcmUmY2hhbm5lbF9iaW5kaW5nPXJlcXVpcmU=', 'base64').toString('utf8');
    } catch (e) {
      return '';
    }
  })();

const sql = neon(databaseUrl);

async function init() {
  console.log('Testing connection to Neon PostgreSQL...');
  const version = await sql`SELECT version()`;
  console.log('Connected! PostgreSQL version:', version[0].version);

  console.log('Creating tables if they do not exist...');

  // 1. Members Table
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR UNIQUE NOT NULL,
      phone VARCHAR,
      password VARCHAR,
      rank VARCHAR DEFAULT 'Partner',
      cs_customer_id VARCHAR,
      sponsor_member_id VARCHAR,
      sponsor_code VARCHAR,
      sponsor_name VARCHAR,
      customer_status VARCHAR DEFAULT 'registered',
      seller_status VARCHAR DEFAULT 'pending_payment',
      referral_code VARCHAR UNIQUE,
      wallet_balance NUMERIC DEFAULT 0,
      total_earnings NUMERIC DEFAULT 0,
      kyc_data JSONB,
      software_license JSONB,
      mlm_account JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 2. Activations Table
  await sql`
    CREATE TABLE IF NOT EXISTS activations (
      id VARCHAR PRIMARY KEY,
      member_id VARCHAR REFERENCES members(id),
      member_name VARCHAR,
      member_email VARCHAR,
      member_phone VARCHAR,
      sponsor_code VARCHAR,
      amount_paid NUMERIC DEFAULT 2500,
      gst_paid NUMERIC DEFAULT 450,
      total_paid NUMERIC DEFAULT 2950,
      payment_method VARCHAR,
      payment_ref VARCHAR,
      utr_number VARCHAR,
      status VARCHAR DEFAULT 'pending',
      account1_mlm JSONB,
      account2_software JSONB,
      requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      approved_at TIMESTAMP WITH TIME ZONE
    );
  `;

  // 3. Orders Table
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      order_id VARCHAR PRIMARY KEY,
      buyer_member_id VARCHAR,
      product_code VARCHAR DEFAULT 'CS-PRO-SUITE',
      amount NUMERIC DEFAULT 2500,
      gst NUMERIC DEFAULT 450,
      total_amount NUMERIC DEFAULT 2950,
      payment_method VARCHAR,
      payment_ref VARCHAR,
      subscription_status VARCHAR DEFAULT 'pending_approval',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 4. Transactions Table
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR PRIMARY KEY,
      member_id VARCHAR REFERENCES members(id),
      description TEXT,
      amount NUMERIC,
      type VARCHAR,
      status VARCHAR DEFAULT 'Available',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 5. Payout Requests Table
  await sql`
    CREATE TABLE IF NOT EXISTS payout_requests (
      id VARCHAR PRIMARY KEY,
      member_id VARCHAR REFERENCES members(id),
      member_name VARCHAR,
      amount NUMERIC,
      tds_amount NUMERIC,
      net_amount NUMERIC,
      bank_name VARCHAR,
      bank_account VARCHAR,
      bank_ifsc VARCHAR,
      status VARCHAR DEFAULT 'pending',
      utr_number VARCHAR,
      screenshot_url TEXT,
      requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE
    );
  `;

  // Check if root partner (Matru) exists; if not, insert baseline root partner
  const existingRoot = await sql`SELECT id FROM members WHERE referral_code = 'CS123456' LIMIT 1`;
  if (existingRoot.length === 0) {
    console.log('Inserting root baseline partner Matru Prasad Panda (CS123456)...');
    await sql`
      INSERT INTO members (
        id, name, email, phone, rank, cs_customer_id, 
        customer_status, seller_status, referral_code, 
        wallet_balance, total_earnings
      ) VALUES (
        'mem_matru', 'Matru Prasad Panda', 'matruprasadpanda497@gmail.com', '+91 9876543210',
        'Senior Partner', 'CS20261010',
        'active_subscriber', 'active', 'CS123456',
        0, 0
      );
    `;
  }

  // Also verify baseline active downline for demonstration
  const rahul = await sql`SELECT id FROM members WHERE referral_code = 'CS-RAHU01' LIMIT 1`;
  if (rahul.length === 0) {
    await sql`
      INSERT INTO members (
        id, name, email, phone, rank, cs_customer_id, 
        sponsor_member_id, sponsor_code, sponsor_name,
        customer_status, seller_status, referral_code, 
        wallet_balance, total_earnings
      ) VALUES (
        'mem_rahul', 'Rahul Sharma', 'rahul.s@example.com', '+91 98111 22334',
        'Active Partner', 'CS20261011',
        'mem_matru', 'CS123456', 'Matru Prasad Panda',
        'active_subscriber', 'active', 'CS-RAHU01',
        0, 0
      );
    `;
  }

  console.log('Database tables successfully verified and initialized!');
}

init().catch(err => {
  console.error('Database initialization error:', err);
  process.exit(1);
});
