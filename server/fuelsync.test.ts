import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

// ─── Mock all db exports ──────────────────────────────────────────────────────
vi.mock("./db", async () => {
  const stationRow = { id: 1, name: "Test Station", code: "TST-001", status: "active", address: "Kampala", city: "Kampala", country: "Uganda", latitude: "0.3476", longitude: "32.5825", phone: null, email: null, ownerId: null, managerId: null, hikVisionHost: null, hikVisionUsername: null, hikVisionPassword: null, atgHost: null, atgPort: 10001, tinNumber: null, licenseNumber: null, createdAt: new Date(), updatedAt: new Date() };
  const tankRow = { id: 1, stationId: 1, name: "Tank 1", fuelTypeId: 1, capacity: "20000", currentLevel: "15000", status: "normal", lastReadingAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
  const txRow = { id: 1, receiptNumber: "RCP-001", stationId: 1, shiftId: null, pumpId: null, attendantId: null, customerId: null, loyaltyCardId: null, transactionType: "fuel_sale", paymentMethod: "cash", fuelTypeId: 1, fuelVolume: "20.000", pricePerUnit: "5200.00", subtotal: "104000.00", taxAmount: "0.00", discountAmount: "0.00", totalAmount: "104000.00", loyaltyPointsEarned: 0, loyaltyPointsRedeemed: 0, mobileMoneyRef: null, mobileMoneyPhone: null, status: "completed", qrCode: null, uraVerificationCode: null, notes: null, transactedAt: new Date(), createdAt: new Date() };
  const ticketRow = { id: 1, ticketNumber: "TKT-001", stationId: null, raisedByUserId: 1, assignedToUserId: null, title: "Test Ticket", description: "Test", category: "technical", priority: "medium", status: "open", resolvedAt: null, closedAt: null, createdAt: new Date(), updatedAt: new Date() };

  return {
    getDb: vi.fn().mockResolvedValue(null),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(null),
    getAllStations: vi.fn().mockResolvedValue([stationRow]),
    getStationById: vi.fn().mockResolvedValue(stationRow),
    createStation: vi.fn().mockResolvedValue({ insertId: 2 }),
    updateStation: vi.fn().mockResolvedValue(undefined),
    getAllFuelTypes: vi.fn().mockResolvedValue([{ id: 1, name: "Petrol", code: "ULP", color: "#f97316", createdAt: new Date(), updatedAt: new Date() }]),
    getFuelPricesForStation: vi.fn().mockResolvedValue([]),
    setFuelPrice: vi.fn().mockResolvedValue({ insertId: 1 }),
    getTanksForStation: vi.fn().mockResolvedValue([tankRow]),
    updateTankLevel: vi.fn().mockResolvedValue(undefined),
    getTankReadings: vi.fn().mockResolvedValue([]),
    getPumpsForStation: vi.fn().mockResolvedValue([]),
    updatePumpStatus: vi.fn().mockResolvedValue(undefined),
    getAttendantsForStation: vi.fn().mockResolvedValue([]),
    getTransactionsForStation: vi.fn().mockResolvedValue([txRow]),
    getTransactionByReceipt: vi.fn().mockResolvedValue(txRow),
    createTransaction: vi.fn().mockResolvedValue({ insertId: 1 }),
    getStationSalesStats: vi.fn().mockResolvedValue({ totalTransactions: 10, totalRevenue: "500000", totalVolume: "1000", avgTransactionValue: "50000" }),
    getTransactionsByDateRange: vi.fn().mockResolvedValue([]),
    getDashboardStats: vi.fn().mockResolvedValue({ totalStations: 1, totalTanks: 2, activeShifts: 1, todayRevenue: 500000, todayTransactions: 10, tankAlerts: 0, lowTankCount: 0, criticalTankCount: 0 }),
    getMultiStationDashboard: vi.fn().mockResolvedValue([]),
    getDeliveriesForStation: vi.fn().mockResolvedValue([]),
    createDelivery: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateDelivery: vi.fn().mockResolvedValue(undefined),
    getLoyaltyCustomers: vi.fn().mockResolvedValue([]),
    getLoyaltyCustomerByCard: vi.fn().mockResolvedValue(null),
    createLoyaltyCustomer: vi.fn().mockResolvedValue({ insertId: 1 }),
    getProductsForStation: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    getShiftsForStation: vi.fn().mockResolvedValue([]),
    getActiveShift: vi.fn().mockResolvedValue(null),
    createShift: vi.fn().mockResolvedValue({ insertId: 1 }),
    closeShift: vi.fn().mockResolvedValue(undefined),
    getAllTickets: vi.fn().mockResolvedValue([ticketRow]),
    getTicketById: vi.fn().mockResolvedValue(ticketRow),
    createTicket: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateTicket: vi.fn().mockResolvedValue(undefined),
    getTicketComments: vi.fn().mockResolvedValue([]),
    addTicketComment: vi.fn().mockResolvedValue({ insertId: 1 }),
    getAllInvoices: vi.fn().mockResolvedValue([]),
    createInvoice: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateInvoice: vi.fn().mockResolvedValue(undefined),
    getRttTransactions: vi.fn().mockResolvedValue([]),
    createRttTransaction: vi.fn().mockResolvedValue({ insertId: 1 }),
    getCreditNotes: vi.fn().mockResolvedValue([]),
    createCreditNote: vi.fn().mockResolvedValue({ insertId: 1 }),
    getAllUsers: vi.fn().mockResolvedValue([]),
    updateUser: vi.fn().mockResolvedValue(undefined),
    getNotificationsForUser: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    getSalesReport: vi.fn().mockResolvedValue([]),
    getPaymentMethodBreakdown: vi.fn().mockResolvedValue([]),
    getFuelConsumptionReport: vi.fn().mockResolvedValue([]),
  };
});

// ─── Context factory ──────────────────────────────────────────────────────────
function makeCtx(role = "admin"): TrpcContext {
  return {
    user: {
      id: 1, openId: "test-user", name: "Test User", email: "test@example.com",
      loginMethod: "manus", role: role as any,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

// ─── auth ─────────────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: any[] = [];
    const ctx: TrpcContext = { ...makeCtx(), res: { clearCookie: (n: string, o: any) => cleared.push({ n, o }) } as any };
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result.success).toBe(true);
    expect(cleared).toHaveLength(1);
    expect(cleared[0].n).toBe(COOKIE_NAME);
  });

  it("returns current user from auth.me", async () => {
    const user = await appRouter.createCaller(makeCtx()).auth.me();
    expect(user?.email).toBe("test@example.com");
    expect(user?.role).toBe("admin");
  });
});

// ─── stations ────────────────────────────────────────────────────────────────
describe("stations", () => {
  it("lists all stations", async () => {
    const stations = await appRouter.createCaller(makeCtx()).stations.list();
    expect(Array.isArray(stations)).toBe(true);
    expect(stations[0].name).toBe("Test Station");
  });

  it("creates a new station (admin only)", async () => {
    const result = await appRouter.createCaller(makeCtx("admin")).stations.create({ name: "New Station", code: "NEW-001", address: "Entebbe", city: "Kampala" });
    expect(result.success).toBe(true);
  });

  it("rejects station creation for non-admin", async () => {
    await expect(appRouter.createCaller(makeCtx("user")).stations.create({ name: "X", code: "X-001" })).rejects.toThrow();
  });
});

// ─── tanks ───────────────────────────────────────────────────────────────────
describe("tanks", () => {
  it("returns tanks for a station", async () => {
    const tanks = await appRouter.createCaller(makeCtx()).tanks.forStation({ stationId: 1 });
    expect(Array.isArray(tanks)).toBe(true);
    expect(tanks[0].name).toBe("Tank 1");
  });

  it("updates tank level", async () => {
    const result = await appRouter.createCaller(makeCtx()).tanks.updateLevel({ tankId: 1, level: "14500", source: "manual" });
    expect(result.success).toBe(true);
  });
});

// ─── transactions ─────────────────────────────────────────────────────────────
describe("transactions", () => {
  it("retrieves a transaction by receipt number", async () => {
    const tx = await appRouter.createCaller(makeCtx()).transactions.byReceipt({ receiptNumber: "RCP-001" });
    expect(tx?.receiptNumber).toBe("RCP-001");
    expect(tx?.totalAmount).toBe("104000.00");
  });

  it("returns transaction stats for a station", async () => {
    const stats = await appRouter.createCaller(makeCtx()).transactions.stats({ stationId: 1 });
    expect(stats.totalTransactions).toBe(10);
  });
});

// ─── dashboard ───────────────────────────────────────────────────────────────
describe("dashboard", () => {
  it("returns dashboard stats", async () => {
    const stats = await appRouter.createCaller(makeCtx()).dashboard.stats();
    expect(stats.totalStations).toBe(1);
    expect(stats.todayRevenue).toBe(500000);
  });

  it("returns multi-station data", async () => {
    const ms = await appRouter.createCaller(makeCtx()).dashboard.multiStation();
    expect(Array.isArray(ms)).toBe(true);
  });
});

// ─── shifts ──────────────────────────────────────────────────────────────────
describe("shifts", () => {
  it("lists shifts for a station", async () => {
    const shifts = await appRouter.createCaller(makeCtx()).shifts.list({ stationId: 1 });
    expect(Array.isArray(shifts)).toBe(true);
  });

  it("returns null for no active shift", async () => {
    const active = await appRouter.createCaller(makeCtx()).shifts.active({ stationId: 1 });
    expect(active).toBeNull();
  });

  it("starts a shift", async () => {
    const result = await appRouter.createCaller(makeCtx()).shifts.start({ stationId: 1, shiftName: "Morning", openingCash: "100000" });
    expect(result.success).toBe(true);
  });
});

// ─── tickets ─────────────────────────────────────────────────────────────────
describe("tickets", () => {
  it("lists tickets", async () => {
    const tickets = await appRouter.createCaller(makeCtx()).tickets.list({});
    expect(Array.isArray(tickets)).toBe(true);
  });

  it("creates a ticket", async () => {
    const result = await appRouter.createCaller(makeCtx()).tickets.create({ title: "Test Issue", description: "Something broke", category: "technical", priority: "high" });
    expect(result.success).toBe(true);
    expect(result.ticketNumber).toMatch(/^TKT-/);
  });

  it("gets a ticket by id", async () => {
    const ticket = await appRouter.createCaller(makeCtx()).tickets.get({ id: 1 });
    expect(ticket.title).toBe("Test Ticket");
  });

  it("updates ticket status", async () => {
    const result = await appRouter.createCaller(makeCtx()).tickets.update({ id: 1, status: "in_progress" });
    expect(result.success).toBe(true);
  });
});

// ─── invoices ────────────────────────────────────────────────────────────────
describe("invoices", () => {
  it("lists invoices (admin)", async () => {
    const invoices = await appRouter.createCaller(makeCtx("admin")).invoices.list();
    expect(Array.isArray(invoices)).toBe(true);
  });

  it("creates an invoice (admin only)", async () => {
    const result = await appRouter.createCaller(makeCtx("admin")).invoices.create({
      clientName: "Acme Fuels Ltd", clientEmail: "billing@acme.com",
      items: [{ description: "System License", quantity: 1, unitPrice: 500000, total: 500000 }],
      subtotal: "500000", taxAmount: "90000", totalAmount: "590000",
    });
    expect(result.success).toBe(true);
  });
});

// ─── reports ─────────────────────────────────────────────────────────────────
describe("reports", () => {
  it("returns sales report", async () => {
    const report = await appRouter.createCaller(makeCtx()).reports.sales({ stationId: 1, from: "2026-01-01", to: "2026-12-31" });
    expect(Array.isArray(report)).toBe(true);
  });

  it("returns payment breakdown", async () => {
    const breakdown = await appRouter.createCaller(makeCtx()).reports.paymentBreakdown({ stationId: 1, from: "2026-01-01", to: "2026-12-31" });
    expect(Array.isArray(breakdown)).toBe(true);
  });

  it("returns fuel consumption report", async () => {
    const consumption = await appRouter.createCaller(makeCtx()).reports.fuelConsumption({ stationId: 1, from: "2026-01-01", to: "2026-12-31" });
    expect(Array.isArray(consumption)).toBe(true);
  });
});

// ─── fuel types ──────────────────────────────────────────────────────────────
describe("fuelTypes", () => {
  it("lists all fuel types", async () => {
    const types = await appRouter.createCaller(makeCtx()).fuelTypes.list();
    expect(Array.isArray(types)).toBe(true);
    expect(types[0].name).toBe("Petrol");
  });
});

// ─── loyalty ─────────────────────────────────────────────────────────────────
describe("loyalty", () => {
  it("lists loyalty customers", async () => {
    const customers = await appRouter.createCaller(makeCtx()).loyalty.customers({ stationId: 1 });
    expect(Array.isArray(customers)).toBe(true);
  });
});
