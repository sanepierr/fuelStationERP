import {
  bigint,
  boolean,
  decimal,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Companies ────────────────────────────────────────────────────────────────

export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  country: varchar("country", { length: 64 }).default("Uganda"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  logoUrl: text("logoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── Users & Auth ────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "company_owner", "company_admin", "manager", "supervisor", "accountant", "technician", "attendant", "user"]).default("user").notNull(),
  companyId: int("companyId"),
  stationId: int("stationId"),
  isActive: boolean("isActive").default(true).notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Stations ────────────────────────────────────────────────────────────────

export const stations = mysqlTable("stations", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  country: varchar("country", { length: 64 }).default("Uganda"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  ownerId: int("ownerId"),
  managerId: int("managerId"),
  status: mysqlEnum("status", ["active", "inactive", "maintenance"]).default("active").notNull(),
  hikVisionHost: text("hikVisionHost"),
  hikVisionUsername: varchar("hikVisionUsername", { length: 128 }),
  hikVisionPassword: varchar("hikVisionPassword", { length: 128 }),
  atgHost: text("atgHost"),
  atgPort: int("atgPort").default(10001),
  tinNumber: varchar("tinNumber", { length: 64 }),
  licenseNumber: varchar("licenseNumber", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Station = typeof stations.$inferSelect;

// ─── Fuel Types ───────────────────────────────────────────────────────────────

export const fuelTypes = mysqlTable("fuel_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  unit: varchar("unit", { length: 16 }).default("litres").notNull(),
  color: varchar("color", { length: 16 }).default("#f59e0b"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FuelType = typeof fuelTypes.$inferSelect;

// ─── Fuel Prices ─────────────────────────────────────────────────────────────

export const fuelPrices = mysqlTable("fuel_prices", {
  id: int("id").autoincrement().primaryKey(),
  stationId: int("stationId").notNull(),
  fuelTypeId: int("fuelTypeId").notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("UGX").notNull(),
  effectiveFrom: timestamp("effectiveFrom").defaultNow().notNull(),
  effectiveTo: timestamp("effectiveTo"),
  setByUserId: int("setByUserId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FuelPrice = typeof fuelPrices.$inferSelect;

// ─── Tanks ────────────────────────────────────────────────────────────────────

export const tanks = mysqlTable("tanks", {
  id: int("id").autoincrement().primaryKey(),
  stationId: int("stationId").notNull(),
  fuelTypeId: int("fuelTypeId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  capacity: decimal("capacity", { precision: 10, scale: 2 }).notNull(),
  currentLevel: decimal("currentLevel", { precision: 10, scale: 2 }).default("0").notNull(),
  minLevel: decimal("minLevel", { precision: 10, scale: 2 }).default("500"),
  maxLevel: decimal("maxLevel", { precision: 10, scale: 2 }),
  atgSensorId: varchar("atgSensorId", { length: 64 }),
  status: mysqlEnum("status", ["normal", "low", "critical", "overfill", "maintenance"]).default("normal").notNull(),
  lastReadingAt: timestamp("lastReadingAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tank = typeof tanks.$inferSelect;

// ─── Tank Readings ────────────────────────────────────────────────────────────

export const tankReadings = mysqlTable("tank_readings", {
  id: int("id").autoincrement().primaryKey(),
  tankId: int("tankId").notNull(),
  stationId: int("stationId").notNull(),
  level: decimal("level", { precision: 10, scale: 2 }).notNull(),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  waterLevel: decimal("waterLevel", { precision: 8, scale: 2 }),
  source: mysqlEnum("source", ["atg", "manual", "delivery"]).default("manual").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  recordedByUserId: int("recordedByUserId"),
});

export type TankReading = typeof tankReadings.$inferSelect;

// ─── Pumps ────────────────────────────────────────────────────────────────────

export const pumps = mysqlTable("pumps", {
  id: int("id").autoincrement().primaryKey(),
  stationId: int("stationId").notNull(),
  tankId: int("tankId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 64 }),
  nozzleCount: int("nozzleCount").default(1).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "fault"]).default("active").notNull(),
  totalizer: decimal("totalizer", { precision: 14, scale: 3 }).default("0"),
  lastMaintenanceAt: timestamp("lastMaintenanceAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pump = typeof pumps.$inferSelect;

// ─── Pump Attendants ──────────────────────────────────────────────────────────

export const pumpAttendants = mysqlTable("pump_attendants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").default(0).notNull(),
  stationId: int("stationId").notNull(),
  employeeId: varchar("employeeId", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  nfcCardId: varchar("nfcCardId", { length: 64 }),
  rfidCardId: varchar("rfidCardId", { length: 64 }),
  isActive: boolean("isActive").default(true).notNull(),
  assignedPumps: json("assignedPumps"),
  hiredAt: timestamp("hiredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PumpAttendant = typeof pumpAttendants.$inferSelect;

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  stationId: int("stationId").notNull(),
  shiftName: varchar("shiftName", { length: 64 }).notNull(),
  supervisorId: int("supervisorId"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  status: mysqlEnum("status", ["active", "closed", "reconciled"]).default("active").notNull(),
  openingCash: decimal("openingCash", { precision: 12, scale: 2 }).default("0"),
  closingCash: decimal("closingCash", { precision: 12, scale: 2 }),
  totalSales: decimal("totalSales", { precision: 14, scale: 2 }).default("0"),
  totalFuelVolume: decimal("totalFuelVolume", { precision: 12, scale: 3 }).default("0"),
  notes: text("notes"),
  reportGeneratedAt: timestamp("reportGeneratedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  receiptNumber: varchar("receiptNumber", { length: 32 }).notNull().unique(),
  stationId: int("stationId").notNull(),
  shiftId: int("shiftId"),
  pumpId: int("pumpId"),
  attendantId: int("attendantId"),
  customerId: int("customerId"),
  loyaltyCardId: varchar("loyaltyCardId", { length: 64 }),
  transactionType: mysqlEnum("transactionType", ["fuel_sale", "product_sale", "prepaid_topup", "credit_sale", "rtt"]).default("fuel_sale").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "mtn_momo", "airtel_money", "visa", "credit", "prepaid", "mixed"]).default("cash").notNull(),
  fuelTypeId: int("fuelTypeId"),
  fuelVolume: decimal("fuelVolume", { precision: 10, scale: 3 }),
  tcVolume: decimal("tcVolume", { precision: 10, scale: 3 }),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }),
  // PTS (Pump Transaction System) integration
  ptsTransactionId: varchar("ptsTransactionId", { length: 64 }).unique(),
  ptsPumpNumber: int("ptsPumpNumber"),
  ptsNozzle: int("ptsNozzle"),
  ptsTotalizerVolume: decimal("ptsTotalizerVolume", { precision: 14, scale: 3 }),
  ptsTotalizerAmount: decimal("ptsTotalizerAmount", { precision: 14, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  loyaltyPointsEarned: int("loyaltyPointsEarned").default(0),
  loyaltyPointsRedeemed: int("loyaltyPointsRedeemed").default(0),
  mobileMoneyRef: varchar("mobileMoneyRef", { length: 64 }),
  mobileMoneyPhone: varchar("mobileMoneyPhone", { length: 32 }),
  status: mysqlEnum("status", ["pending", "completed", "cancelled", "refunded", "failed"]).default("completed").notNull(),
  qrCode: text("qrCode"),
  uraVerificationCode: varchar("uraVerificationCode", { length: 64 }),
  notes: text("notes"),
  transactedAt: timestamp("transactedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;

// ─── Transaction Items (for product sales) ────────────────────────────────────

export const transactionItems = mysqlTable("transaction_items", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: int("transactionId").notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
});

// ─── Products (Gas, Lubes, Tyres, etc.) ──────────────────────────────────────

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  stationId: int("stationId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 64 }),
  category: mysqlEnum("category", ["gas", "lubes", "tyres", "accessories", "food", "other"]).default("other").notNull(),
  unit: varchar("unit", { length: 32 }).default("unit").notNull(),
  sellingPrice: decimal("sellingPrice", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  stockQuantity: decimal("stockQuantity", { precision: 12, scale: 3 }).default("0").notNull(),
  minStockLevel: decimal("minStockLevel", { precision: 10, scale: 3 }).default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;

// ─── Fuel Deliveries ──────────────────────────────────────────────────────────

export const fuelDeliveries = mysqlTable("fuel_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  deliveryOrderNumber: varchar("deliveryOrderNumber", { length: 32 }).notNull().unique(),
  stationId: int("stationId").notNull(),
  tankId: int("tankId").notNull(),
  fuelTypeId: int("fuelTypeId").notNull(),
  depotName: varchar("depotName", { length: 255 }),
  supplierName: varchar("supplierName", { length: 255 }),
  truckNumber: varchar("truckNumber", { length: 32 }),
  driverName: varchar("driverName", { length: 128 }),
  orderedVolume: decimal("orderedVolume", { precision: 12, scale: 3 }).notNull(),
  dispatchedVolume: decimal("dispatchedVolume", { precision: 12, scale: 3 }),
  receivedVolume: decimal("receivedVolume", { precision: 12, scale: 3 }),
  tankLevelBefore: decimal("tankLevelBefore", { precision: 10, scale: 2 }),
  tankLevelAfter: decimal("tankLevelAfter", { precision: 10, scale: 2 }),
  pricePerLitre: decimal("pricePerLitre", { precision: 10, scale: 4 }),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }),
  status: mysqlEnum("status", ["ordered", "dispatched", "in_transit", "delivered", "verified", "cancelled"]).default("ordered").notNull(),
  dispatchedAt: timestamp("dispatchedAt"),
  deliveredAt: timestamp("deliveredAt"),
  verifiedAt: timestamp("verifiedAt"),
  verifiedByUserId: int("verifiedByUserId"),
  receivedByUserId: int("receivedByUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FuelDelivery = typeof fuelDeliveries.$inferSelect;

// ─── Loyalty Customers ────────────────────────────────────────────────────────

export const loyaltyCustomers = mysqlTable("loyalty_customers", {
  id: int("id").autoincrement().primaryKey(),
  customerNumber: varchar("customerNumber", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  nfcCardId: varchar("nfcCardId", { length: 64 }).unique(),
  rfidCardId: varchar("rfidCardId", { length: 64 }).unique(),
  totalPoints: int("totalPoints").default(0).notNull(),
  totalFuelPurchased: decimal("totalFuelPurchased", { precision: 14, scale: 3 }).default("0"),
  totalAmountSpent: decimal("totalAmountSpent", { precision: 14, scale: 2 }).default("0"),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).default("bronze").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  registeredStationId: int("registeredStationId"),
  registeredByUserId: int("registeredByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoyaltyCustomer = typeof loyaltyCustomers.$inferSelect;

// ─── Loyalty Transactions ─────────────────────────────────────────────────────

export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  transactionId: int("transactionId"),
  type: mysqlEnum("type", ["earn", "redeem", "expire", "adjust"]).default("earn").notNull(),
  points: int("points").notNull(),
  balanceBefore: int("balanceBefore").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Prepaid Accounts ─────────────────────────────────────────────────────────

export const prepaidAccounts = mysqlTable("prepaid_accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountNumber: varchar("accountNumber", { length: 32 }).notNull().unique(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 8 }).default("UGX").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  stationId: int("stationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Credit Accounts ──────────────────────────────────────────────────────────

export const creditAccounts = mysqlTable("credit_accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountNumber: varchar("accountNumber", { length: 32 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  companyName: varchar("companyName", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }).default("0").notNull(),
  currentBalance: decimal("currentBalance", { precision: 12, scale: 2 }).default("0").notNull(),
  stationId: int("stationId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Credit Notes ─────────────────────────────────────────────────────────────

export const creditNotes = mysqlTable("credit_notes", {
  id: int("id").autoincrement().primaryKey(),
  creditNoteNumber: varchar("creditNoteNumber", { length: 32 }).notNull().unique(),
  stationId: int("stationId").notNull(),
  creditAccountId: int("creditAccountId"),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason"),
  relatedTransactionId: int("relatedTransactionId"),
  issuedByUserId: int("issuedByUserId"),
  status: mysqlEnum("status", ["draft", "issued", "applied", "cancelled"]).default("draft").notNull(),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Invoices (Admin to Client) ───────────────────────────────────────────────

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 32 }).notNull().unique(),
  fromUserId: int("fromUserId").notNull(),
  toStationId: int("toStationId"),
  toUserId: int("toUserId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  items: json("items").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("UGX").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft").notNull(),
  dueDate: timestamp("dueDate"),
  notes: text("notes"),
  pdfUrl: text("pdfUrl"),
  sentAt: timestamp("sentAt"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 32 }).notNull().unique(),
  stationId: int("stationId"),
  raisedByUserId: int("raisedByUserId").notNull(),
  assignedToUserId: int("assignedToUserId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["technical", "billing", "operational", "maintenance", "other"]).default("other").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;

// ─── Ticket Comments ──────────────────────────────────────────────────────────

export const ticketComments = mysqlTable("ticket_comments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  isInternal: boolean("isInternal").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── RTT (Return to Turn) Transactions ───────────────────────────────────────

export const rttTransactions = mysqlTable("rtt_transactions", {
  id: int("id").autoincrement().primaryKey(),
  rttNumber: varchar("rttNumber", { length: 32 }).notNull().unique(),
  stationId: int("stationId").notNull(),
  pumpId: int("pumpId"),
  technicianId: int("technicianId"),
  supervisorId: int("supervisorId"),
  fuelTypeId: int("fuelTypeId"),
  volume: decimal("volume", { precision: 10, scale: 3 }),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "reconciled"]).default("pending").notNull(),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  reconciledAt: timestamp("reconciledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Shift Attendant Assignments ──────────────────────────────────────────────

export const shiftAttendants = mysqlTable("shift_attendants", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  attendantId: int("attendantId").notNull(),
  pumpId: int("pumpId"),
  openingTotalizer: decimal("openingTotalizer", { precision: 14, scale: 3 }),
  closingTotalizer: decimal("closingTotalizer", { precision: 14, scale: 3 }),
  totalVolumeSold: decimal("totalVolumeSold", { precision: 12, scale: 3 }),
  totalSalesAmount: decimal("totalSalesAmount", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── PTS Controllers ──────────────────────────────────────────────────────────
// Maps a physical forecourt controller (identified by PtsId) to a station.

export const ptsControllers = mysqlTable("pts_controllers", {
  id: int("id").autoincrement().primaryKey(),
  ptsId: varchar("ptsId", { length: 64 }).notNull().unique(),
  stationId: int("stationId").notNull(),
  label: varchar("label", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastSeenAt: timestamp("lastSeenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PtsController = typeof ptsControllers.$inferSelect;

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 64 }).notNull(),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: int("entityId"),
  stationId: int("stationId"),
  before: json("before"),
  after: json("after"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "alert", "success"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  link: text("link"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
