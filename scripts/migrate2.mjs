import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE `pump_attendants` MODIFY COLUMN `userId` int NOT NULL DEFAULT 0");
  console.log('Modified userId column');
} catch(e) { console.log('userId modify:', e.message); }
try {
  await conn.execute("ALTER TABLE `pump_attendants` ADD COLUMN `name` varchar(128)");
  console.log('Added name column');
} catch(e) { console.log('name col:', e.message); }
try {
  await conn.execute("ALTER TABLE `pump_attendants` ADD COLUMN `phone` varchar(32)");
  console.log('Added phone column');
} catch(e) { console.log('phone col:', e.message); }
console.log('Migration complete');
await conn.end();
