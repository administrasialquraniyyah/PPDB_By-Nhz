const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.fnfcjpyaqzpncbnlktdq:Janganlupa461@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');
    
    // Create isolated ppdb schema
    await client.query('CREATE SCHEMA IF NOT EXISTS ppdb;');
    console.log('Schema "ppdb" created successfully!');

    // Check schemas
    const res = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public', 'ppdb');");
    console.log('Available schemas:', res.rows.map(r => r.schema_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
