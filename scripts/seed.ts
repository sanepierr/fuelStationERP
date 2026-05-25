/**
 * FuelSync Pro - Database seed script
 * Run with: pnpm tsx scripts/seed.ts
 * Requires DATABASE_URL in .env
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq, sql } from "drizzle-orm";
import {
  companies, users, stations, fuelTypes, fuelPrices,
  tanks, tankReadings, pumps, pumpAttendants, shifts,
  transactions, products, fuelDeliveries, loyaltyCustomers,
  notifications, tickets,
} from "../drizzle/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = drizzle(url);
  console.log("Connected to database");

  // ─── Company (upsert) ────────────────────────────────────────────────────────
  await db.insert(companies).values({
    name: "Kiari Petroleum Ltd",
    code: "KPL",
    country: "Uganda",
    phone: "+256 700 123456",
    email: "info@kiaripetroleum.co.ug",
    address: "Plot 45, Industrial Area, Kampala",
    isActive: true,
  }).onDuplicateKeyUpdate({ set: { name: "Kiari Petroleum Ltd" } });
  const [companyRow] = await db.select({ id: companies.id }).from(companies).where(eq(companies.code, "KPL")).limit(1);
  const companyId = companyRow.id;
  console.log(`Company ready: id=${companyId}`);

  // ─── Admin user (upsert by email) ────────────────────────────────────────────
  const adminHash = await hashPassword("Admin@1234");
  await db.insert(users).values({
    openId: "seed-admin-001",
    name: "Pierre Kiari",
    email: "kiaripierre0@gmail.com",
    passwordHash: adminHash,
    loginMethod: "password",
    role: "super_admin",
    companyId,
    isActive: true,
  }).onDuplicateKeyUpdate({ set: { role: "super_admin", companyId, passwordHash: adminHash } });
  const [adminRow] = await db.select({ id: users.id }).from(users).where(eq(users.email, "kiaripierre0@gmail.com")).limit(1);
  const adminId = adminRow.id;
  console.log(`Admin user ready: id=${adminId}`);

  // ─── Manager user (upsert) ───────────────────────────────────────────────────
  const mgrHash = await hashPassword("Manager@1234");
  await db.insert(users).values({
    openId: "seed-mgr-001",
    name: "Sarah Nalwoga",
    email: "sarah.manager@kiaripetroleum.co.ug",
    passwordHash: mgrHash,
    loginMethod: "password",
    role: "manager",
    companyId,
    isActive: true,
  }).onDuplicateKeyUpdate({ set: { role: "manager", companyId } });
  const [mgrRow] = await db.select({ id: users.id }).from(users).where(eq(users.email, "sarah.manager@kiaripetroleum.co.ug")).limit(1);
  const managerId = mgrRow.id;
  console.log(`Manager ready: id=${managerId}`);

  // ─── Stations ────────────────────────────────────────────────────────────────
  const stationRows = [
    {
      companyId,
      name: "Kiari Station - Kampala",
      code: "KPL-KLA",
      address: "Jinja Road, Kampala",
      city: "Kampala",
      country: "Uganda",
      latitude: "0.3476",
      longitude: "32.5825",
      phone: "+256 700 111001",
      email: "kampala@kiaripetroleum.co.ug",
      ownerId: adminId,
      managerId,
      status: "active" as const,
      tinNumber: "1004567890",
      licenseNumber: "URA/FUE/2024/001",
      pts2SyncEnabled: false,
    },
    {
      companyId,
      name: "Kiari Station - Entebbe",
      code: "KPL-ENT",
      address: "Entebbe Road, Entebbe",
      city: "Entebbe",
      country: "Uganda",
      latitude: "0.0608",
      longitude: "32.4637",
      phone: "+256 700 111002",
      email: "entebbe@kiaripetroleum.co.ug",
      ownerId: adminId,
      managerId,
      status: "active" as const,
      tinNumber: "1004567891",
      licenseNumber: "URA/FUE/2024/002",
      pts2SyncEnabled: false,
    },
    {
      companyId,
      name: "Kiari Station - Jinja",
      code: "KPL-JJA",
      address: "Brewery Road, Jinja",
      city: "Jinja",
      country: "Uganda",
      latitude: "0.4244",
      longitude: "33.2037",
      phone: "+256 700 111003",
      email: "jinja@kiaripetroleum.co.ug",
      ownerId: adminId,
      managerId,
      status: "active" as const,
      tinNumber: "1004567892",
      licenseNumber: "URA/FUE/2024/003",
      pts2SyncEnabled: false,
    },
  ];

  const stationIds: number[] = [];
  for (const s of stationRows) {
    await db.insert(stations).values(s).onDuplicateKeyUpdate({ set: { name: s.name } });
    const [row] = await db.select({ id: stations.id }).from(stations).where(eq(stations.code, s.code)).limit(1);
    stationIds.push(row.id);
  }
  console.log(`Stations ready: ids=${stationIds.join(", ")}`);

  // ─── Fuel Types ──────────────────────────────────────────────────────────────
  const fuelTypeRows = [
    { name: "Petrol (ULP 93)", code: "PMS", unit: "litres", color: "#22c55e" },
    { name: "Diesel (AGO)", code: "AGO", unit: "litres", color: "#f59e0b" },
    { name: "Kerosene (DPK)", code: "DPK", unit: "litres", color: "#3b82f6" },
  ];
  const fuelTypeIds: number[] = [];
  for (const ft of fuelTypeRows) {
    await db.insert(fuelTypes).values({ ...ft, isActive: true }).onDuplicateKeyUpdate({ set: { name: ft.name } });
    const [row] = await db.select({ id: fuelTypes.id }).from(fuelTypes).where(eq(fuelTypes.code, ft.code)).limit(1);
    fuelTypeIds.push(row.id);
  }
  const [petrolId, dieselId, keroId] = fuelTypeIds;
  console.log(`Fuel types created: ids=${fuelTypeIds.join(", ")}`);

  // ─── Fuel Prices ─────────────────────────────────────────────────────────────
  const prices = [
    { fuelTypeId: petrolId, pricePerUnit: "5300.00" },
    { fuelTypeId: dieselId, pricePerUnit: "4850.00" },
    { fuelTypeId: keroId,   pricePerUnit: "4200.00" },
  ];
  for (const stId of stationIds) {
    for (const p of prices) {
      await db.insert(fuelPrices).values({ stationId: stId, ...p, currency: "UGX", isActive: true, setByUserId: adminId });
    }
  }
  console.log("Fuel prices seeded");

  // ─── Tanks ───────────────────────────────────────────────────────────────────
  const tankIdsByStation: number[][] = [];
  for (const stId of stationIds) {
    const tankRows = [
      { stationId: stId, fuelTypeId: petrolId, name: "Tank T1 - Petrol", capacity: "45000.00", currentLevel: "31500.00", minLevel: "2000.00", status: "normal" as const },
      { stationId: stId, fuelTypeId: dieselId, name: "Tank T2 - Diesel", capacity: "30000.00", currentLevel: "8200.00",  minLevel: "2000.00", status: "low"    as const },
      { stationId: stId, fuelTypeId: keroId,   name: "Tank T3 - Kero",   capacity: "20000.00", currentLevel: "980.00",   minLevel: "1000.00", status: "critical" as const },
    ];
    const ids: number[] = [];
    for (const t of tankRows) {
      const [r] = await db.insert(tanks).values({ ...t, lastReadingAt: new Date() }).$returningId();
      ids.push(r.id);
      // seed a reading row
      await db.insert(tankReadings).values({
        tankId: r.id, stationId: stId, level: t.currentLevel, source: "manual", recordedByUserId: adminId,
      });
    }
    tankIdsByStation.push(ids);
  }
  console.log("Tanks seeded");

  // ─── Pumps ───────────────────────────────────────────────────────────────────
  const pumpIdsByStation: number[][] = [];
  for (let si = 0; si < stationIds.length; si++) {
    const stId = stationIds[si];
    const [t1, t2] = tankIdsByStation[si];
    const pumpRows = [
      { stationId: stId, tankId: t1, name: "Pump 1", serialNumber: `SN-${stId}0-P1`, nozzleCount: 2, status: "active" as const, totalizer: "182450.500" },
      { stationId: stId, tankId: t1, name: "Pump 2", serialNumber: `SN-${stId}0-P2`, nozzleCount: 2, status: "active" as const, totalizer: "95320.750" },
      { stationId: stId, tankId: t2, name: "Pump 3", serialNumber: `SN-${stId}0-P3`, nozzleCount: 2, status: "active" as const, totalizer: "143210.200" },
      { stationId: stId, tankId: t2, name: "Pump 4", serialNumber: `SN-${stId}0-P4`, nozzleCount: 1, status: "maintenance" as const, totalizer: "62100.000" },
    ];
    const ids: number[] = [];
    for (const p of pumpRows) {
      const [r] = await db.insert(pumps).values(p).$returningId();
      ids.push(r.id);
    }
    pumpIdsByStation.push(ids);
  }
  console.log("Pumps seeded");

  // ─── Attendants ──────────────────────────────────────────────────────────────
  const attendantNames = [
    ["John Mukasa", "+256 701 201001"],
    ["Grace Atim",  "+256 701 201002"],
    ["David Okello","+256 701 201003"],
    ["Rose Nambi",  "+256 701 201004"],
  ];
  for (let si = 0; si < stationIds.length; si++) {
    const stId = stationIds[si];
    const pumpsForStation = pumpIdsByStation[si];
    for (let ai = 0; ai < 2; ai++) {
      const [name, phone] = attendantNames[ai];
      const empId = `EMP-${stId}-${String(ai + 1).padStart(3, "0")}`;
      await db.insert(pumpAttendants).values({
        userId: 0,
        stationId: stId,
        employeeId: empId,
        name,
        phone,
        isActive: true,
        assignedPumps: [pumpsForStation[ai]],
        hiredAt: new Date("2023-01-15"),
      });
    }
  }
  console.log("Attendants seeded");

  // ─── Shifts ───────────────────────────────────────────────────────────────────
  const shiftIdsByStation: number[] = [];
  for (const stId of stationIds) {
    const morning = new Date(); morning.setHours(6, 0, 0, 0);
    const [r] = await db.insert(shifts).values({
      stationId: stId,
      shiftName: "Morning Shift",
      supervisorId: managerId,
      startTime: morning,
      status: "active",
      openingCash: "500000.00",
      totalSales: "0.00",
      totalFuelVolume: "0.000",
    }).$returningId();
    shiftIdsByStation.push(r.id);

    // Also add a closed evening shift from yesterday
    const yestEvening = new Date(); yestEvening.setDate(yestEvening.getDate() - 1); yestEvening.setHours(14, 0, 0, 0);
    const yestClose   = new Date(); yestClose.setDate(yestClose.getDate() - 1);     yestClose.setHours(22, 0, 0, 0);
    await db.insert(shifts).values({
      stationId: stId,
      shiftName: "Evening Shift",
      supervisorId: managerId,
      startTime: yestEvening,
      endTime: yestClose,
      status: "closed",
      openingCash: "500000.00",
      closingCash: "3200000.00",
      totalSales: "8450000.00",
      totalFuelVolume: "1620.500",
    });
  }
  console.log("Shifts seeded");

  // ─── Transactions ─────────────────────────────────────────────────────────────
  function randBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }
  const payMethods = ["cash", "mtn_momo", "airtel_money", "visa", "credit"] as const;
  let txSeq = 1;

  for (let si = 0; si < stationIds.length; si++) {
    const stId = stationIds[si];
    const shiftId = shiftIdsByStation[si];
    const pumpId = pumpIdsByStation[si][0];

    // 15 recent transactions per station over past 7 days
    for (let d = 6; d >= 0; d--) {
      const dayCount = d === 0 ? 6 : 2; // more txns today
      for (let t = 0; t < dayCount; t++) {
        const txDate = new Date();
        txDate.setDate(txDate.getDate() - d);
        txDate.setHours(8 + Math.floor(randBetween(0, 12)), Math.floor(randBetween(0, 60)), 0, 0);

        const vol = parseFloat(randBetween(10, 80).toFixed(3));
        const pricePerUnit = 5300;
        const subtotal = parseFloat((vol * pricePerUnit).toFixed(2));
        const tax = parseFloat((subtotal * 0.18).toFixed(2));
        const total = parseFloat((subtotal + tax).toFixed(2));
        const payMethod = payMethods[Math.floor(Math.random() * payMethods.length)];
        const seq = String(txSeq++).padStart(6, "0");
        const receipt = `FSP-${new Date().getFullYear()}-${seq}`;

        await db.insert(transactions).values({
          receiptNumber: receipt,
          stationId: stId,
          shiftId,
          pumpId,
          transactionType: "fuel_sale",
          paymentMethod: payMethod,
          fuelTypeId: petrolId,
          fuelVolume: String(vol),
          pricePerUnit: String(pricePerUnit),
          subtotal: String(subtotal),
          taxAmount: String(tax),
          discountAmount: "0.00",
          totalAmount: String(total),
          loyaltyPointsEarned: Math.floor(total / 10000),
          status: "completed",
          transactedAt: txDate,
        });
      }
    }
  }
  console.log(`Transactions seeded: ${txSeq - 1} total`);

  // ─── Products ─────────────────────────────────────────────────────────────────
  const productRows = [
    { name: "Engine Oil 5W-30 1L", category: "lubes"        as const, sku: "OIL-5W30-1L", sellingPrice: "28000.00", costPrice: "18000.00", stockQuantity: "48.000" },
    { name: "Air Freshener",        category: "accessories"  as const, sku: "ACC-AIRFR",    sellingPrice: "5000.00",  costPrice: "2500.00",  stockQuantity: "100.000" },
    { name: "LPG Cylinder 6kg",     category: "gas"          as const, sku: "GAS-LPG-6K",  sellingPrice: "90000.00", costPrice: "72000.00", stockQuantity: "12.000" },
    { name: "Tyre Inflator",        category: "accessories"  as const, sku: "ACC-TINFLT",  sellingPrice: "3000.00",  costPrice: "1000.00",  stockQuantity: "200.000" },
    { name: "Windshield Washer",    category: "accessories"  as const, sku: "ACC-WWASH",   sellingPrice: "8000.00",  costPrice: "4000.00",  stockQuantity: "30.000" },
  ];
  for (const stId of stationIds) {
    for (const p of productRows) {
      await db.insert(products).values({ stationId: stId, ...p, unit: "unit", isActive: true, minStockLevel: "5.000" });
    }
  }
  console.log("Products seeded");

  // ─── Fuel Deliveries ─────────────────────────────────────────────────────────
  let delSeq = 1;
  for (let si = 0; si < stationIds.length; si++) {
    const stId = stationIds[si];
    const [t1, t2] = tankIdsByStation[si];
    const delDate = new Date(); delDate.setDate(delDate.getDate() - 3);
    await db.insert(fuelDeliveries).values([
      {
        deliveryOrderNumber: `DO-${String(delSeq++).padStart(4, "0")}`,
        stationId: stId, tankId: t1, fuelTypeId: petrolId,
        supplierName: "Vivo Energy Uganda", truckNumber: "UAA 123X",
        orderedVolume: "20000.000", receivedVolume: "20000.000",
        pricePerLitre: "4800.0000", totalCost: "96000000.00",
        deliveredAt: delDate, status: "delivered" as const,
        notes: "Full tanker delivery",
      },
      {
        deliveryOrderNumber: `DO-${String(delSeq++).padStart(4, "0")}`,
        stationId: stId, tankId: t2, fuelTypeId: dieselId,
        supplierName: "Total Energies Uganda", truckNumber: "UBA 456Y",
        orderedVolume: "15000.000",
        pricePerLitre: "4400.0000", totalCost: "65912000.00",
        status: "ordered" as const,
        notes: "Partial shortfall - 20L claimed in transit",
      },
    ]);
  }
  console.log("Deliveries seeded");

  // ─── Loyalty Customers ────────────────────────────────────────────────────────
  const loyaltyData = [
    { name: "Moses Byarugaba", phone: "+256 773 001001", email: "moses@example.com", totalPoints: 4850, tier: "silver" as const },
    { name: "Agnes Nantume",   phone: "+256 773 001002", email: "agnes@example.com",  totalPoints: 12400, tier: "gold" as const },
    { name: "Robert Ssebufu",  phone: "+256 773 001003", email: "robert@example.com", totalPoints: 820,   tier: "bronze" as const },
  ];
  for (let i = 0; i < loyaltyData.length; i++) {
    const lc = loyaltyData[i];
    await db.insert(loyaltyCustomers).values({
      registeredStationId: stationIds[0],
      customerNumber: `LC-${String(1001 + i)}`,
      name: lc.name,
      phone: lc.phone,
      email: lc.email,
      totalPoints: lc.totalPoints,
      lifetimePoints: lc.totalPoints + Math.floor(Math.random() * 2000),
      tier: lc.tier,
      isActive: true,
    });
  }
  console.log("Loyalty customers seeded");

  // ─── Tickets ─────────────────────────────────────────────────────────────────
  await db.insert(tickets).values([
    {
      ticketNumber: "TKT-0001",
      stationId: stationIds[0],
      title: "Pump 3 nozzle dripping",
      description: "Pump 3 nozzle has a slow drip even when the handle is off. Needs seal replacement.",
      category: "maintenance",
      priority: "high",
      status: "open",
      raisedByUserId: managerId,
      assignedToUserId: adminId,
    },
    {
      ticketNumber: "TKT-0002",
      stationId: stationIds[1],
      title: "POS printer jam on lane 2",
      description: "Receipt printer at lane 2 is jamming after every 3rd print. Paper roll changed - issue persists.",
      category: "technical",
      priority: "medium",
      status: "in_progress",
      raisedByUserId: managerId,
      assignedToUserId: adminId,
    },
    {
      ticketNumber: "TKT-0003",
      stationId: stationIds[2],
      title: "Tank T3 ATG sensor offline",
      description: "ATG sensor for Kerosene tank T3 is not transmitting. Manual dip readings required until fixed.",
      category: "maintenance",
      priority: "high",
      status: "open",
      raisedByUserId: managerId,
    },
  ]);
  console.log("Tickets seeded");

  // ─── Notifications ────────────────────────────────────────────────────────────
  await db.insert(notifications).values([
    { userId: adminId, title: "Low Fuel Alert", message: "Tank T2 - Diesel at Kampala station is below minimum level (8,200L / 30,000L capacity)", type: "alert", isRead: false },
    { userId: adminId, title: "Critical Fuel Alert", message: "Tank T3 - Kero at all stations is critically low. Arrange delivery immediately.", type: "alert", isRead: false },
    { userId: adminId, title: "Shift Started", message: "Morning Shift opened at Kiari Station - Kampala", type: "info", isRead: true },
    { userId: adminId, title: "Delivery Pending", message: "Total Energies delivery at Entebbe station is awaiting confirmation", type: "info", isRead: false },
  ]);
  console.log("Notifications seeded");

  console.log("\n✓ Seed complete! Summary:");
  console.log(`  Company:      Kiari Petroleum Ltd (id=${companyId})`);
  console.log(`  Admin login:  kiaripierre0@gmail.com / Admin@1234`);
  console.log(`  Manager:      sarah.manager@kiaripetroleum.co.ug / Manager@1234`);
  console.log(`  Stations:     ${stationIds.length} (Kampala, Entebbe, Jinja)`);
  console.log(`  Transactions: ${txSeq - 1} across 7 days`);

  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
