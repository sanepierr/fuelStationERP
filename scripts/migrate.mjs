import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sqlFile = path.join(__dirname, '../drizzle/0001_orange_stepford_cuckoos.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');
const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

const conn = await mysql.createConnection(dbUrl);

for (let i = 1; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await conn.execute(stmt);
    console.log(`✓ Statement ${i+1}: ${stmt.substring(0, 60)}`);
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
      console.log(`⚠ Skip ${i+1} (already exists): ${stmt.substring(0, 60)}`);
    } else {
      console.error(`✗ Error ${i+1}: ${err.message}`);
    }
  }
}

await conn.end();
console.log('Migration complete!');
