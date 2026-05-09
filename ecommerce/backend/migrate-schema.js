require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ 
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL 
});

async function applySchema() {
  try {
    const schema = fs.readFileSync('./src/db/schema.sql', 'utf8');
    
    // Split into individual statements and execute
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log('Executing:', stmt.trim().substring(0, 50) + '...');
        try {
          await pool.query(stmt);
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
            console.error('Error executing statement:', err.message);
          }
        }
      }
    }
    
    console.log('✓ Schema migration completed');
    process.exit(0);
  } catch (err) {
    console.error('✗ Schema migration failed:', err.message);
    process.exit(1);
  }
}

applySchema();
