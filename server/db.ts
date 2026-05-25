import { and, desc, eq, gte, lte, sql, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, stations, fuelTypes, fuelPrices, tanks, tankReadings,
  pumps, pumpAttendants, shifts, shiftAttendants, transactions, transactionItems,
  products, fuelDeliveries, loyaltyCustomers, loyaltyTransactions, prepaidAccounts,
  creditAccounts, creditNotes, invoices, tickets, ticketComments, rttTransactions,
  notifications, auditLogs, ptsControllers
} from "../drizzle/schema";
import { encrypt, safeDecrypt } from './_core/crypto';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Station Queries ──────────────────────────────────────────────────────────

function decryptStation<T extends { hikVisionPassword?: string | null }>(row: T): T {
  return { ...row, hikVisionPassword: safeDecrypt(row.hikVisionPassword) };
}

function encryptStationData<T extends Partial<typeof stations.$inferInsert>>(data: T): T {
  if (data.hikVisionPassword != null) {
    return { ...data, hikVisionPassword: encrypt(data.hikVisionPassword) };
  }
  return data;
}

export async function getAllStations() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(stations).orderBy(stations.name);
  return rows.map(decryptStation);
}

export async function getStationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stations).where(eq(stations.id, id)).limit(1);
  return result[0] ? decryptStation(result[0]) : undefined;
}

export async function createStation(data: typeof stations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(stations).values(encryptStationData(data));
}

export async function updateStation(id: number, data: Partial<typeof stations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(stations).set(encryptStationData(data)).where(eq(stations.id, id));
}

// ─── Fuel Type Queries ────────────────────────────────────────────────────────

export async function getAllFuelTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fuelTypes).where(eq(fuelTypes.isActive, true));
}

// ─── Fuel Price Queries ───────────────────────────────────────────────────────

export async function getFuelPricesForStation(stationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fuelPrices)
    .where(and(eq(fuelPrices.stationId, stationId), eq(fuelPrices.isActive, true)))
    .orderBy(fuelPrices.fuelTypeId);
}

export async function setFuelPrice(data: typeof fuelPrices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  type Trx = Parameters<(typeof db)['transaction']>[0];
  await db.transaction(async (trx: Trx) => {
    await trx.update(fuelPrices).set({ isActive: false, effectiveTo: new Date() })
      .where(and(eq(fuelPrices.stationId, data.stationId!), eq(fuelPrices.fuelTypeId, data.fuelTypeId!), eq(fuelPrices.isActive, true)));
    await trx.insert(fuelPrices).values({ ...data, isActive: true });
  });
}

// ─── Tank Queries ─────────────────────────────────────────────────────────────

export async function getTanksForStation(stationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tanks).where(eq(tanks.stationId, stationId)).orderBy(tanks.name);
}

export async function updateTankLevel(tankId: number, level: string, source: 'atg' | 'manual' | 'delivery' = 'manual', userId?: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const tank = await db.select().from(tanks).where(eq(tanks.id, tankId)).limit(1);
  if (!tank[0]) throw new Error('Tank not found');
  
  let status: 'normal' | 'low' | 'critical' | 'overfill' | 'maintenance' = 'normal';
  const lvl = parseFloat(level);
  const minLvl = parseFloat(tank[0].minLevel || '0');
  const capacity = parseFloat(tank[0].capacity);
  if (lvl <= minLvl * 0.5) status = 'critical';
  else if (lvl <= minLvl) status = 'low';
  else if (lvl >= capacity * 0.95) status = 'overfill';
  
  await db.update(tanks).set({ currentLevel: level, status, lastReadingAt: new Date() }).where(eq(tanks.id, tankId));
  await db.insert(tankReadings).values({ tankId, stationId: tank[0].stationId, level, source, recordedByUserId: userId });
}

export async function getTankReadings(tankId: number, limit = 24) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tankReadings).where(eq(tankReadings.tankId, tankId))
    .orderBy(desc(tankReadings.recordedAt)).limit(limit);
}

// ─── Pump Queries ─────────────────────────────────────────────────────────────

export async function getPumpsForStation(stationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pumps).where(eq(pumps.stationId, stationId)).orderBy(pumps.name);
}

export async function getPumpByStationAndNumber(stationId: number, pumpNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  // PTS uses 1-based pump numbers; match by ordering position or name suffix
  const all = await db.select().from(pumps)
    .where(eq(pumps.stationId, stationId))
    .orderBy(pumps.id);
  // Try exact name match first ("Pump 1", "PUMP1", "1"), then fall back to positional index
  type PumpRow = typeof all[number];
  const byName = all.find((p: PumpRow) =>
    p.name === `Pump ${pumpNumber}` ||
    p.name === `PUMP${pumpNumber}` ||
    p.name === String(pumpNumber)
  );
  return byName ?? all[pumpNumber - 1];
}

export async function updatePumpStatus(pumpId: number, status: typeof pumps.$inferSelect['status']) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(pumps).set({ status }).where(eq(pumps.id, pumpId));
}

export async function updatePumpTotalizer(pumpId: number, totalizer: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(pumps).set({ totalizer }).where(eq(pumps.id, pumpId));
}

export async function getTransactionByPtsId(ptsTransactionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions)
    .where(eq(transactions.ptsTransactionId, ptsTransactionId))
    .limit(1);
  return result[0];
}

// ─── Attendant Queries ────────────────────────────────────────────────────────

export async function getAttendantsForStation(stationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: pumpAttendants.id,
    userId: pumpAttendants.userId,
    stationId: pumpAttendants.stationId,
    employeeId: pumpAttendants.employeeId,
    nfcCardId: pumpAttendants.nfcCardId,
    rfidCardId: pumpAttendants.rfidCardId,
    isActive: pumpAttendants.isActive,
    assignedPumps: pumpAttendants.assignedPumps,
    hiredAt: pumpAttendants.hiredAt,
    createdAt: pumpAttendants.createdAt,
    name: users.name,
    email: users.email,
    phone: users.phone,
  }).from(pumpAttendants)
    .leftJoin(users, eq(pumpAttendants.userId, users.id))
    .where(eq(pumpAttendants.stationId, stationId));
}

// ─── Transaction Queries ──────────────────────────────────────────────────────

export async function getTransactionsForStation(stationId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(eq(transactions.stationId, stationId))
    .orderBy(desc(transactions.transactedAt))
    .limit(limit).offset(offset);
}

export async function getTransactionByReceipt(receiptNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.receiptNumber, receiptNumber)).limit(1);
  return result[0];
}

export async function createTransaction(data: typeof transactions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(transactions).values(data);
}

export async function createTransactionWithTankUpdate(
  txData: typeof transactions.$inferInsert,
  tankId: number,
  newLevel: string,
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  type Trx = Parameters<(typeof db)['transaction']>[0];
  await db.transaction(async (trx: Trx) => {
    await trx.insert(transactions).values(txData);

    const tank = await trx.select().from(tanks).where(eq(tanks.id, tankId)).limit(1);
    if (!tank[0]) throw new Error('Tank not found');

    const lvl = parseFloat(newLevel);
    const minLvl = parseFloat(tank[0].minLevel || '0');
    const capacity = parseFloat(tank[0].capacity);
    let status: 'normal' | 'low' | 'critical' | 'overfill' | 'maintenance' = 'normal';
    if (lvl <= minLvl * 0.5) status = 'critical';
    else if (lvl <= minLvl) status = 'low';
    else if (lvl >= capacity * 0.95) status = 'overfill';

    await trx.update(tanks).set({ currentLevel: newLevel, status, lastReadingAt: new Date() }).where(eq(tanks.id, tankId));
    await trx.insert(tankReadings).values({ tankId, stationId: tank[0].stationId, level: newLevel, source: 'manual', recordedByUserId: userId });
  });
}

export async function getStationSalesStats(stationId: number) {
  const db = await getDb();
  if (!db) return { todayTotal: 0, weekTotal: 0, monthTotal: 0, todayVolume: 0 };
  
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  
  const [todayStats] = await db.select({
    total: sql<number>`COALESCE(SUM(totalAmount), 0)`,
    volume: sql<number>`COALESCE(SUM(fuelVolume), 0)`,
    count: sql<number>`COUNT(*)`
  }).from(transactions).where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, today), eq(transactions.status, 'completed')));
  
  const [weekStats] = await db.select({ total: sql<number>`COALESCE(SUM(totalAmount), 0)` })
    .from(transactions).where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, weekAgo), eq(transactions.status, 'completed')));
  
  const [monthStats] = await db.select({ total: sql<number>`COALESCE(SUM(totalAmount), 0)` })
    .from(transactions).where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, monthAgo), eq(transactions.status, 'completed')));
  
  return {
    todayTotal: Number(todayStats?.total || 0),
    weekTotal: Number(weekStats?.total || 0),
    monthTotal: Number(monthStats?.total || 0),
    todayVolume: Number(todayStats?.volume || 0),
    todayCount: Number(todayStats?.count || 0),
  };
}

export async function getTransactionsByDateRange(stationId: number, from: Date, to: Date, limit = 500, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, from), lte(transactions.transactedAt, to)))
    .orderBy(desc(transactions.transactedAt))
    .limit(limit).offset(offset);
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalStations: 0, totalTransactions: 0, totalRevenue: 0, activeShifts: 0 };
  
  const today = new Date(); today.setHours(0, 0, 0, 0);
  
  const [stationCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(stations).where(eq(stations.status, 'active'));
  const [txStats] = await db.select({ count: sql<number>`COUNT(*)`, revenue: sql<number>`COALESCE(SUM(totalAmount), 0)` })
    .from(transactions).where(and(gte(transactions.transactedAt, today), eq(transactions.status, 'completed')));
  const [shiftCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(shifts).where(eq(shifts.status, 'active'));
  const [tankAlerts] = await db.select({ count: sql<number>`COUNT(*)` }).from(tanks).where(or(eq(tanks.status, 'low'), eq(tanks.status, 'critical')));
  
  return {
    totalStations: Number(stationCount?.count || 0),
    todayTransactions: Number(txStats?.count || 0),
    todayRevenue: Number(txStats?.revenue || 0),
    activeShifts: Number(shiftCount?.count || 0),
    tankAlerts: Number(tankAlerts?.count || 0),
  };
}

// ─── Fuel Delivery Queries ────────────────────────────────────────────────────

export async function getDeliveriesForStation(stationId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fuelDeliveries).where(eq(fuelDeliveries.stationId, stationId)).orderBy(desc(fuelDeliveries.createdAt)).limit(limit).offset(offset);
}

export async function createDelivery(data: typeof fuelDeliveries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(fuelDeliveries).values(data);
}

export async function updateDelivery(id: number, data: Partial<typeof fuelDeliveries.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(fuelDeliveries).set(data).where(eq(fuelDeliveries.id, id));
}

export async function updateDeliveryWithTankLevel(
  id: number,
  deliveryData: Partial<typeof fuelDeliveries.$inferInsert>,
  tankId: number,
  newLevel: string,
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  type Trx = Parameters<(typeof db)['transaction']>[0];
  await db.transaction(async (trx: Trx) => {
    await trx.update(fuelDeliveries).set(deliveryData).where(eq(fuelDeliveries.id, id));

    const tank = await trx.select().from(tanks).where(eq(tanks.id, tankId)).limit(1);
    if (!tank[0]) throw new Error('Tank not found');

    const lvl = parseFloat(newLevel);
    const minLvl = parseFloat(tank[0].minLevel || '0');
    const capacity = parseFloat(tank[0].capacity);
    let status: 'normal' | 'low' | 'critical' | 'overfill' | 'maintenance' = 'normal';
    if (lvl <= minLvl * 0.5) status = 'critical';
    else if (lvl <= minLvl) status = 'low';
    else if (lvl >= capacity * 0.95) status = 'overfill';

    await trx.update(tanks).set({ currentLevel: newLevel, status, lastReadingAt: new Date() }).where(eq(tanks.id, tankId));
    await trx.insert(tankReadings).values({ tankId, stationId: tank[0].stationId, level: newLevel, source: 'delivery', recordedByUserId: userId });
  });
}

// ─── Loyalty Queries ──────────────────────────────────────────────────────────

export async function getLoyaltyCustomers(stationId?: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (stationId) conditions.push(eq(loyaltyCustomers.registeredStationId, stationId));
  if (search) conditions.push(or(like(loyaltyCustomers.name, `%${search}%`), like(loyaltyCustomers.phone, `%${search}%`), like(loyaltyCustomers.customerNumber, `%${search}%`)));
  return db.select().from(loyaltyCustomers).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(loyaltyCustomers.totalPoints));
}

export async function getLoyaltyCustomerByCard(cardId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(loyaltyCustomers)
    .where(or(eq(loyaltyCustomers.nfcCardId, cardId), eq(loyaltyCustomers.rfidCardId, cardId))).limit(1);
  return result[0];
}

export async function createLoyaltyCustomer(data: typeof loyaltyCustomers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(loyaltyCustomers).values(data);
}

// ─── Product Queries ──────────────────────────────────────────────────────────

export async function getProductsForStation(stationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(and(eq(products.stationId, stationId), eq(products.isActive, true))).orderBy(products.category, products.name);
}

export async function createProduct(data: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(products).values(data);
}

export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(products).set(data).where(eq(products.id, id));
}

// ─── Shift Queries ────────────────────────────────────────────────────────────

export async function getShiftsForStation(stationId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shifts).where(eq(shifts.stationId, stationId)).orderBy(desc(shifts.startTime)).limit(limit);
}

export async function getActiveShift(stationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shifts).where(and(eq(shifts.stationId, stationId), eq(shifts.status, 'active'))).limit(1);
  return result[0];
}

export async function createShift(data: typeof shifts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(shifts).values(data);
}

export async function closeShift(shiftId: number, data: Partial<typeof shifts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(shifts).set({ ...data, status: 'closed', endTime: new Date() }).where(eq(shifts.id, shiftId));
}

// ─── Ticket Queries ───────────────────────────────────────────────────────────

export async function getAllTickets(filters?: { status?: string; stationId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(tickets.status, filters.status as any));
  if (filters?.stationId) conditions.push(eq(tickets.stationId, filters.stationId));
  return db.select().from(tickets).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(tickets.createdAt)).limit(filters?.limit ?? 100).offset(filters?.offset ?? 0);
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result[0];
}

export async function createTicket(data: typeof tickets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(tickets).values(data);
}

export async function updateTicket(id: number, data: Partial<typeof tickets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(tickets).set(data).where(eq(tickets.id, id));
}

export async function getTicketComments(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: ticketComments.id,
    ticketId: ticketComments.ticketId,
    comment: ticketComments.comment,
    isInternal: ticketComments.isInternal,
    createdAt: ticketComments.createdAt,
    userName: users.name,
    userRole: users.role,
  }).from(ticketComments).leftJoin(users, eq(ticketComments.userId, users.id))
    .where(eq(ticketComments.ticketId, ticketId)).orderBy(ticketComments.createdAt);
}

export async function addTicketComment(data: typeof ticketComments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(ticketComments).values(data);
}

// ─── Invoice Queries ──────────────────────────────────────────────────────────

export async function getAllInvoices(userId?: number, stationId?: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (userId) conditions.push(or(eq(invoices.fromUserId, userId), eq(invoices.toUserId, userId)));
  if (stationId) conditions.push(eq(invoices.toStationId, stationId));
  return db.select().from(invoices).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset);
}

export async function createInvoice(data: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(invoices).values(data);
}

export async function updateInvoice(id: number, data: Partial<typeof invoices.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(invoices).set(data).where(eq(invoices.id, id));
}

// ─── RTT Queries ──────────────────────────────────────────────────────────────

export async function getRttTransactions(stationId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rttTransactions).where(eq(rttTransactions.stationId, stationId)).orderBy(desc(rttTransactions.createdAt)).limit(limit).offset(offset);
}

export async function createRttTransaction(data: typeof rttTransactions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(rttTransactions).values(data);
}

// ─── Credit Note Queries ──────────────────────────────────────────────────────

export async function getCreditNotes(stationId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditNotes).where(eq(creditNotes.stationId, stationId)).orderBy(desc(creditNotes.createdAt)).limit(limit).offset(offset);
}

export async function createCreditNote(data: typeof creditNotes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.insert(creditNotes).values(data);
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  return db.update(users).set(data).where(eq(users.id, id));
}

// ─── Notification Queries ─────────────────────────────────────────────────────

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(20);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  return db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

// ─── Report Queries ───────────────────────────────────────────────────────────

export async function getSalesReport(stationId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql<string>`DATE(transactedAt)`,
    totalAmount: sql<number>`SUM(totalAmount)`,
    totalVolume: sql<number>`SUM(fuelVolume)`,
    transactionCount: sql<number>`COUNT(*)`,
    paymentMethod: transactions.paymentMethod,
  }).from(transactions)
    .where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, from), lte(transactions.transactedAt, to), eq(transactions.status, 'completed')))
    .groupBy(sql`DATE(transactedAt)`, transactions.paymentMethod)
    .orderBy(sql`DATE(transactedAt)`);
}

export async function getPaymentMethodBreakdown(stationId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    paymentMethod: transactions.paymentMethod,
    total: sql<number>`SUM(totalAmount)`,
    count: sql<number>`COUNT(*)`,
  }).from(transactions)
    .where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, from), lte(transactions.transactedAt, to), eq(transactions.status, 'completed')))
    .groupBy(transactions.paymentMethod);
}

export async function getFuelConsumptionReport(stationId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    fuelTypeId: transactions.fuelTypeId,
    totalVolume: sql<number>`SUM(fuelVolume)`,
    totalRevenue: sql<number>`SUM(totalAmount)`,
    count: sql<number>`COUNT(*)`,
    date: sql<string>`DATE(transactedAt)`,
  }).from(transactions)
    .where(and(eq(transactions.stationId, stationId), gte(transactions.transactedAt, from), lte(transactions.transactedAt, to), eq(transactions.status, 'completed')))
    .groupBy(transactions.fuelTypeId, sql`DATE(transactedAt)`)
    .orderBy(sql`DATE(transactedAt)`);
}

export async function getMultiStationDashboard() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const allStations = await db.select().from(stations).where(eq(stations.status, 'active'));

  const results = await Promise.all(allStations.map(async (station) => {
    const [stats] = await db.select({
      revenue: sql<number>`COALESCE(SUM(totalAmount), 0)`,
      volume: sql<number>`COALESCE(SUM(fuelVolume), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(transactions).where(and(eq(transactions.stationId, station.id), gte(transactions.transactedAt, today), eq(transactions.status, 'completed')));

    const tankList = await db.select().from(tanks).where(eq(tanks.stationId, station.id));
    const alerts = tankList.filter(t => t.status === 'low' || t.status === 'critical').length;

    return {
      ...station,
      todayRevenue: Number(stats?.revenue || 0),
      todayVolume: Number(stats?.volume || 0),
      todayTransactions: Number(stats?.count || 0),
      tankAlerts: alerts,
      tanks: tankList,
    };
  }));

  return results;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function writeAuditLog(entry: {
  userId?: number;
  action: string;
  entity: string;
  entityId?: number;
  stationId?: number;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    stationId: entry.stationId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ipAddress: entry.ipAddress,
  }).catch(() => {
    // Audit logging must never crash the main request
  });
}

export async function getAuditLogs(opts: { stationId?: number; userId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.stationId) conditions.push(eq(auditLogs.stationId, opts.stationId));
  if (opts.userId) conditions.push(eq(auditLogs.userId, opts.userId));
  return db.select().from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
}

// ─── PTS Controllers ──────────────────────────────────────────────────────────

export async function getPtsControllerByPtsId(ptsId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(ptsControllers).where(eq(ptsControllers.ptsId, ptsId)).limit(1);
  return rows[0];
}

export async function getAllPtsControllers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ptsControllers).orderBy(ptsControllers.ptsId);
}

export async function upsertPtsController(data: { ptsId: string; stationId: number; label?: string | null; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(ptsControllers).values({
    ptsId: data.ptsId,
    stationId: data.stationId,
    label: data.label ?? null,
    isActive: data.isActive ?? true,
  }).onDuplicateKeyUpdate({
    set: {
      stationId: data.stationId,
      label: data.label ?? null,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updatePtsController(id: number, data: Partial<typeof ptsControllers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(ptsControllers).set(data).where(eq(ptsControllers.id, id));
}

export async function touchPtsControllerLastSeen(ptsId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(ptsControllers).set({ lastSeenAt: new Date() }).where(eq(ptsControllers.ptsId, ptsId)).catch(() => {});
}
