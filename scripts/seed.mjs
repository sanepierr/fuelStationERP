import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Fuel types
await conn.execute(`INSERT IGNORE INTO fuel_types (name, code, unit, color) VALUES
  ('Petrol (ULP)', 'ULP', 'litres', '#f59e0b'),
  ('Diesel', 'DSL', 'litres', '#ef4444'),
  ('Premium Petrol', 'PRM', 'litres', '#8b5cf6'),
  ('Kerosene', 'KRS', 'litres', '#06b6d4')`);
console.log('✓ Fuel types seeded');

// Demo stations
await conn.execute(`INSERT IGNORE INTO stations (name, code, address, city, country, latitude, longitude, phone, status, tinNumber) VALUES
  ('FuelSync Kampala Central', 'KLA-001', 'Plot 45, Kampala Road', 'Kampala', 'Uganda', 0.3476, 32.5825, '+256700000001', 'active', 'TIN001234'),
  ('FuelSync Entebbe', 'ENT-001', 'Entebbe Road, Entebbe', 'Entebbe', 'Uganda', 0.0512, 32.4637, '+256700000002', 'active', 'TIN001235'),
  ('FuelSync Jinja', 'JJA-001', 'Main Street, Jinja', 'Jinja', 'Uganda', 0.4244, 33.2041, '+256700000003', 'active', 'TIN001236')`);
console.log('✓ Demo stations seeded');

// Demo tanks for station 1
await conn.execute(`INSERT IGNORE INTO tanks (stationId, fuelTypeId, name, capacity, currentLevel, minLevel, status) VALUES
  (1, 1, 'Tank A - Petrol', 20000, 12500, 2000, 'normal'),
  (1, 2, 'Tank B - Diesel', 30000, 8000, 3000, 'low'),
  (1, 3, 'Tank C - Premium', 10000, 6500, 1000, 'normal'),
  (2, 1, 'Tank A - Petrol', 15000, 9000, 1500, 'normal'),
  (2, 2, 'Tank B - Diesel', 20000, 4500, 2000, 'low'),
  (3, 1, 'Tank A - Petrol', 25000, 18000, 2500, 'normal'),
  (3, 2, 'Tank B - Diesel', 25000, 15000, 2500, 'normal')`);
console.log('✓ Demo tanks seeded');

// Demo pumps for station 1
await conn.execute(`INSERT IGNORE INTO pumps (stationId, tankId, name, serialNumber, nozzleCount, status, totalizer) VALUES
  (1, 1, 'Pump 1', 'SN-P001', 2, 'active', 125430.500),
  (1, 1, 'Pump 2', 'SN-P002', 2, 'active', 98765.250),
  (1, 2, 'Pump 3', 'SN-P003', 2, 'active', 234567.000),
  (1, 2, 'Pump 4', 'SN-P004', 1, 'maintenance', 45678.750),
  (2, 4, 'Pump 1', 'SN-P005', 2, 'active', 87654.000),
  (3, 6, 'Pump 1', 'SN-P006', 2, 'active', 156789.500)`);
console.log('✓ Demo pumps seeded');

// Demo fuel prices
await conn.execute(`INSERT IGNORE INTO fuel_prices (stationId, fuelTypeId, pricePerUnit, currency, isActive) VALUES
  (1, 1, 5200, 'UGX', true),
  (1, 2, 4800, 'UGX', true),
  (1, 3, 5800, 'UGX', true),
  (2, 1, 5200, 'UGX', true),
  (2, 2, 4800, 'UGX', true),
  (3, 1, 5250, 'UGX', true),
  (3, 2, 4850, 'UGX', true)`);
console.log('✓ Demo fuel prices seeded');

// Demo transactions for reporting
const now = new Date();
const txData = [];
for (let i = 0; i < 50; i++) {
  const d = new Date(now - i * 3600000 * 6);
  const vol = (Math.random() * 50 + 5).toFixed(3);
  const price = 5200;
  const total = (vol * price).toFixed(2);
  const methods = ['cash', 'mtn_momo', 'airtel_money', 'visa', 'credit'];
  const method = methods[Math.floor(Math.random() * methods.length)];
  const rn = `RCP${String(1000 + i).padStart(6, '0')}`;
  txData.push(`('${rn}', 1, 1, 1, 1, 'fuel_sale', '${method}', 1, ${vol}, 5200, ${total}, 0, 0, ${total}, 0, 0, 'completed', '${d.toISOString().slice(0,19).replace('T',' ')}')`);
}
await conn.execute(`INSERT IGNORE INTO transactions (receiptNumber, stationId, shiftId, pumpId, attendantId, transactionType, paymentMethod, fuelTypeId, fuelVolume, pricePerUnit, subtotal, taxAmount, discountAmount, totalAmount, loyaltyPointsEarned, loyaltyPointsRedeemed, status, transactedAt) VALUES ${txData.join(',')}`);
console.log('✓ Demo transactions seeded');

// Demo loyalty customers
await conn.execute(`INSERT IGNORE INTO loyalty_customers (customerNumber, name, phone, email, totalPoints, totalFuelPurchased, totalAmountSpent, tier, isActive, registeredStationId) VALUES
  ('LC-000001', 'John Mukasa', '+256701234567', 'john@example.com', 2500, 1200.500, 6240000, 'silver', true, 1),
  ('LC-000002', 'Mary Nakato', '+256702345678', 'mary@example.com', 850, 450.000, 2340000, 'bronze', true, 1),
  ('LC-000003', 'Peter Ssemakula', '+256703456789', 'peter@example.com', 8900, 4500.000, 23400000, 'gold', true, 2),
  ('LC-000004', 'Grace Apio', '+256704567890', 'grace@example.com', 15600, 8200.000, 42640000, 'platinum', true, 1)`);
console.log('✓ Demo loyalty customers seeded');

// Demo tickets
await conn.execute(`INSERT IGNORE INTO tickets (ticketNumber, stationId, raisedByUserId, title, description, category, priority, status) VALUES
  ('TKT-000001', 1, 1, 'ATG Sensor Calibration Required', 'Tank A ATG sensor showing inconsistent readings', 'technical', 'high', 'open'),
  ('TKT-000002', 2, 1, 'Pump 2 Nozzle Replacement', 'Pump 2 nozzle is leaking and needs replacement', 'maintenance', 'critical', 'in_progress'),
  ('TKT-000003', 1, 1, 'Monthly Invoice Query', 'Query regarding the system subscription invoice for April', 'billing', 'medium', 'open')`);
console.log('✓ Demo tickets seeded');

// Demo shifts
await conn.execute(`INSERT IGNORE INTO shifts (stationId, shiftName, startTime, endTime, status, openingCash, closingCash, totalSales, totalFuelVolume) VALUES
  (1, 'Morning Shift', DATE_SUB(NOW(), INTERVAL 8 HOUR), NOW(), 'closed', 500000, 2340000, 8750000, 1680.500),
  (1, 'Afternoon Shift', NOW(), NULL, 'active', 2340000, NULL, 0, 0),
  (2, 'Morning Shift', DATE_SUB(NOW(), INTERVAL 8 HOUR), NOW(), 'closed', 300000, 1890000, 6540000, 1256.000)`);
console.log('✓ Demo shifts seeded');

await conn.end();
console.log('\n✅ All seed data applied successfully!');
