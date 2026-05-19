import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import * as db from "./db";

// ─── Role Middleware ──────────────────────────────────────────────────────────

const ownerOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'owner'].includes(ctx.user.role)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin or Owner access required' });
  return next({ ctx });
});

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'owner', 'manager', 'supervisor'].includes(ctx.user.role)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager access required' });
  return next({ ctx });
});

// Webhook callers must supply X-Webhook-Secret matching WEBHOOK_SECRET env var
const webhookProcedure = publicProcedure.use(({ ctx, next }) => {
  const secret = ENV.webhookSecret;
  if (!secret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Webhook secret not configured' });
  const supplied = ctx.req.headers['x-webhook-secret'];
  if (!supplied || supplied !== secret) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid webhook secret' });
  return next({ ctx });
});

// ─── Helper: Generate Receipt Number ─────────────────────────────────────────

function generateReceiptNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = nanoid(6).toUpperCase();
  return `RCP${y}${m}${d}-${rand}`;
}

function generateOrderNumber(prefix: string) {
  const rand = nanoid(8).toUpperCase();
  return `${prefix}-${rand}`;
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    multiStation: protectedProcedure.query(async () => {
      return db.getMultiStationDashboard();
    }),
  }),

  // ─── Stations ──────────────────────────────────────────────────────────────

  stations: router({
    list: protectedProcedure.query(async () => db.getAllStations()),
    
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const station = await db.getStationById(input.id);
      if (!station) throw new TRPCError({ code: 'NOT_FOUND' });
      return station;
    }),
    
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional().default('Uganda'),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      tinNumber: z.string().optional(),
      licenseNumber: z.string().optional(),
      hikVisionHost: z.string().optional(),
      atgHost: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.createStation(input as any);
      await db.writeAuditLog({ userId: ctx.user.id, action: 'create_station', entity: 'stations', after: { name: input.name, code: input.code }, ipAddress: ctx.req.ip });
      return { success: true };
    }),

    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).optional(),
      hikVisionHost: z.string().optional(),
      hikVisionUsername: z.string().optional(),
      hikVisionPassword: z.string().optional(),
      atgHost: z.string().optional(),
      atgPort: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateStation(id, data as any);
      // Exclude password from audit record
      const { hikVisionPassword: _pw, ...auditData } = data;
      await db.writeAuditLog({ userId: ctx.user.id, action: 'update_station', entity: 'stations', entityId: id, after: auditData, ipAddress: ctx.req.ip });
      return { success: true };
    }),
  }),

  // ─── Fuel Types & Prices ───────────────────────────────────────────────────

  fuelTypes: router({
    list: publicProcedure.query(async () => db.getAllFuelTypes()),
  }),

  fuelPrices: router({
    forStation: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getFuelPricesForStation(input.stationId);
    }),
    
    set: managerProcedure.input(z.object({
      stationId: z.number(),
      fuelTypeId: z.number(),
      pricePerUnit: z.string(),
      currency: z.string().default('UGX'),
    })).mutation(async ({ input, ctx }) => {
      await db.setFuelPrice({ ...input, setByUserId: ctx.user.id });
      await db.writeAuditLog({ userId: ctx.user.id, action: 'set_fuel_price', entity: 'fuel_prices', stationId: input.stationId, after: input, ipAddress: ctx.req.ip });
      return { success: true };
    }),
  }),

  // ─── Tanks ─────────────────────────────────────────────────────────────────

  tanks: router({
    forStation: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getTanksForStation(input.stationId);
    }),
    
    readings: protectedProcedure.input(z.object({ tankId: z.number(), limit: z.number().optional() })).query(async ({ input }) => {
      return db.getTankReadings(input.tankId, input.limit);
    }),
    
    updateLevel: managerProcedure.input(z.object({
      tankId: z.number(),
      level: z.string(),
      source: z.enum(['atg', 'manual', 'delivery']).default('manual'),
    })).mutation(async ({ input, ctx }) => {
      await db.updateTankLevel(input.tankId, input.level, input.source, ctx.user.id);
      return { success: true };
    }),
    
    create: adminProcedure.input(z.object({
      stationId: z.number(),
      fuelTypeId: z.number(),
      name: z.string(),
      capacity: z.string(),
      minLevel: z.string().optional(),
      atgSensorId: z.string().optional(),
    })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { tanks } = await import('../drizzle/schema');
      await dbConn.insert(tanks).values(input as any);
      return { success: true };
    }),
  }),

  // ─── Pumps ─────────────────────────────────────────────────────────────────

  pumps: router({
    forStation: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getPumpsForStation(input.stationId);
    }),
    
    updateStatus: managerProcedure.input(z.object({
      pumpId: z.number(),
      status: z.enum(['active', 'inactive', 'maintenance', 'fault']),
    })).mutation(async ({ input }) => {
      await db.updatePumpStatus(input.pumpId, input.status);
      return { success: true };
    }),
    
    create: adminProcedure.input(z.object({
      stationId: z.number(),
      tankId: z.number(),
      name: z.string(),
      serialNumber: z.string().optional(),
      nozzleCount: z.number().default(1),
    })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { pumps } = await import('../drizzle/schema');
      await dbConn.insert(pumps).values(input as any);
      return { success: true };
    }),
  }),

  // ─── Attendants ────────────────────────────────────────────────────────────

  attendants: router({
    forStation: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getAttendantsForStation(input.stationId);
    }),
    
    register: managerProcedure.input(z.object({
      userId: z.number().optional().default(0),
      stationId: z.number(),
      employeeId: z.string(),
      name: z.string().optional(),
      phone: z.string().optional(),
      nfcCardId: z.string().optional(),
      rfidCardId: z.string().optional(),
      assignedPumps: z.array(z.number()).optional(),
    })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { pumpAttendants } = await import('../drizzle/schema');
      await dbConn.insert(pumpAttendants).values({ ...input, userId: input.userId ?? 0, assignedPumps: input.assignedPumps || [] } as any);
      return { success: true };
    }),
    
    toggleActive: managerProcedure.input(z.object({ id: z.number(), isActive: z.boolean() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { pumpAttendants } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await dbConn.update(pumpAttendants).set({ isActive: input.isActive }).where(eq(pumpAttendants.id, input.id));
      return { success: true };
    }),
  }),

  // ─── Transactions ──────────────────────────────────────────────────────────

  transactions: router({
    list: protectedProcedure.input(z.object({
      stationId: z.number(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })).query(async ({ input }) => {
      return db.getTransactionsForStation(input.stationId, input.limit, input.offset);
    }),
    
    byReceipt: publicProcedure.input(z.object({ receiptNumber: z.string() })).query(async ({ input }) => {
      return db.getTransactionByReceipt(input.receiptNumber);
    }),
    
    create: protectedProcedure.input(z.object({
      stationId: z.number(),
      shiftId: z.number().optional(),
      pumpId: z.number().optional(),
      attendantId: z.number().optional(),
      customerId: z.number().optional(),
      loyaltyCardId: z.string().optional(),
      transactionType: z.enum(['fuel_sale', 'product_sale', 'prepaid_topup', 'credit_sale', 'rtt']).default('fuel_sale'),
      paymentMethod: z.enum(['cash', 'mtn_momo', 'airtel_money', 'visa', 'credit', 'prepaid', 'mixed']).default('cash'),
      fuelTypeId: z.number().optional(),
      fuelVolume: z.string().optional(),
      pricePerUnit: z.string().optional(),
      subtotal: z.string(),
      taxAmount: z.string().optional().default('0'),
      discountAmount: z.string().optional().default('0'),
      totalAmount: z.string(),
      loyaltyPointsEarned: z.number().optional().default(0),
      loyaltyPointsRedeemed: z.number().optional().default(0),
      mobileMoneyPhone: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const receiptNumber = generateReceiptNumber();
      const uraCode = `URA-${nanoid(12).toUpperCase()}`;
      const qrData = JSON.stringify({
        receipt: receiptNumber,
        ura: uraCode,
        station: input.stationId,
        amount: input.totalAmount,
        date: new Date().toISOString(),
      });
      const qrCode = await QRCode.toDataURL(qrData);
      
      const txData = {
        ...input,
        receiptNumber,
        uraVerificationCode: uraCode,
        qrCode,
      } as any;

      // Fuel sales: atomically insert the transaction and decrement the tank level
      if (input.transactionType === 'fuel_sale' && input.pumpId && input.fuelVolume) {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pumps, tanks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const pump = await dbConn.select().from(pumps).where(eq(pumps.id, input.pumpId)).limit(1);
        if (pump[0]) {
          const tank = await dbConn.select().from(tanks).where(eq(tanks.id, pump[0].tankId)).limit(1);
          if (tank[0]) {
            const newLevel = (parseFloat(tank[0].currentLevel) - parseFloat(input.fuelVolume)).toFixed(2);
            await db.createTransactionWithTankUpdate(txData, tank[0].id, newLevel, ctx.user.id);
            return { success: true, receiptNumber, qrCode, uraCode };
          }
        }
      }

      await db.createTransaction(txData);
      return { success: true, receiptNumber, qrCode, uraCode };
    }),
    
    stats: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getStationSalesStats(input.stationId);
    }),
  }),

  // ─── Fuel Deliveries ───────────────────────────────────────────────────────

  deliveries: router({
    list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getDeliveriesForStation(input.stationId);
    }),
    
    create: managerProcedure.input(z.object({
      stationId: z.number(),
      tankId: z.number(),
      fuelTypeId: z.number(),
      depotName: z.string().optional(),
      supplierName: z.string().optional(),
      truckNumber: z.string().optional(),
      driverName: z.string().optional(),
      orderedVolume: z.string(),
      pricePerLitre: z.string().optional(),
    })).mutation(async ({ input }) => {
      const orderNumber = generateOrderNumber('DEL');
      await db.createDelivery({ ...input, deliveryOrderNumber: orderNumber, status: 'ordered' } as any);
      return { success: true, orderNumber };
    }),
    
    updateStatus: managerProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['ordered', 'dispatched', 'in_transit', 'delivered', 'verified', 'cancelled']),
      receivedVolume: z.string().optional(),
      tankLevelBefore: z.string().optional(),
      tankLevelAfter: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, status, ...rest } = input;
      const updateData: any = { status, ...rest };
      if (status === 'dispatched') updateData.dispatchedAt = new Date();
      if (status === 'delivered') { updateData.deliveredAt = new Date(); updateData.receivedByUserId = ctx.user.id; }
      if (status === 'verified') { updateData.verifiedAt = new Date(); updateData.verifiedByUserId = ctx.user.id; }
      // Atomically update delivery + tank level when marking delivered
      if (status === 'delivered' && input.tankLevelAfter) {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { fuelDeliveries } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const result = await dbConn.select().from(fuelDeliveries).where(eq(fuelDeliveries.id, id)).limit(1);
        const delivery = result[0];
        if (delivery) {
          await db.updateDeliveryWithTankLevel(id, updateData, delivery.tankId, input.tankLevelAfter, ctx.user.id);
          return { success: true };
        }
      }

      await db.updateDelivery(id, updateData);
      return { success: true };
    }),
  }),

  // ─── Products ──────────────────────────────────────────────────────────────

  products: router({
    list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getProductsForStation(input.stationId);
    }),
    
    create: managerProcedure.input(z.object({
      stationId: z.number(),
      name: z.string(),
      sku: z.string().optional(),
      category: z.enum(['gas', 'lubes', 'tyres', 'accessories', 'food', 'other']).default('other'),
      unit: z.string().default('unit'),
      sellingPrice: z.string(),
      costPrice: z.string().optional(),
      stockQuantity: z.string().optional().default('0'),
      minStockLevel: z.string().optional().default('0'),
    })).mutation(async ({ input }) => {
      await db.createProduct(input as any);
      return { success: true };
    }),
    
    update: managerProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      sellingPrice: z.string().optional(),
      stockQuantity: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProduct(id, data as any);
      return { success: true };
    }),
  }),

  // ─── Loyalty ───────────────────────────────────────────────────────────────

  loyalty: router({
    customers: protectedProcedure.input(z.object({
      stationId: z.number().optional(),
      search: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getLoyaltyCustomers(input.stationId, input.search);
    }),
    
    register: protectedProcedure.input(z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string().email().optional(),
      nfcCardId: z.string().optional(),
      rfidCardId: z.string().optional(),
      stationId: z.number(),
    })).mutation(async ({ input, ctx }) => {
      const customerNumber = `LC-${String(Date.now()).slice(-6)}`;
      await db.createLoyaltyCustomer({
        ...input,
        customerNumber,
        registeredStationId: input.stationId,
        registeredByUserId: ctx.user.id,
      } as any);
      return { success: true, customerNumber };
    }),
    
    lookupCard: protectedProcedure.input(z.object({ cardId: z.string() })).query(async ({ input }) => {
      return db.getLoyaltyCustomerByCard(input.cardId);
    }),
  }),

  // ─── Shifts ────────────────────────────────────────────────────────────────

  shifts: router({
    list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getShiftsForStation(input.stationId);
    }),
    
    active: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getActiveShift(input.stationId);
    }),
    
    start: managerProcedure.input(z.object({
      stationId: z.number(),
      shiftName: z.string(),
      openingCash: z.string().optional().default('0'),
    })).mutation(async ({ input, ctx }) => {
      await db.createShift({ ...input, supervisorId: ctx.user.id, startTime: new Date(), status: 'active' } as any);
      return { success: true };
    }),
    
    close: managerProcedure.input(z.object({
      shiftId: z.number(),
      closingCash: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { shiftId, ...data } = input;
      await db.closeShift(shiftId, data as any);
      return { success: true };
    }),
  }),

  // ─── RTT Transactions ──────────────────────────────────────────────────────

  rtt: router({
    list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getRttTransactions(input.stationId);
    }),
    
    create: protectedProcedure.input(z.object({
      stationId: z.number(),
      pumpId: z.number().optional(),
      fuelTypeId: z.number().optional(),
      volume: z.string().optional(),
      reason: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const rttNumber = generateOrderNumber('RTT');
      await db.createRttTransaction({ ...input, rttNumber, technicianId: ctx.user.id, status: 'pending' } as any);
      return { success: true, rttNumber };
    }),
    
    approve: managerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { rttTransactions } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await dbConn.update(rttTransactions).set({ status: 'approved', approvedByUserId: ctx.user.id, approvedAt: new Date() }).where(eq(rttTransactions.id, input.id));
      return { success: true };
    }),
  }),

  // ─── Tickets ───────────────────────────────────────────────────────────────

  tickets: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      stationId: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getAllTickets(input);
    }),
    
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const ticket = await db.getTicketById(input.id);
      if (!ticket) throw new TRPCError({ code: 'NOT_FOUND' });
      const comments = await db.getTicketComments(input.id);
      return { ...ticket, comments };
    }),
    
    create: protectedProcedure.input(z.object({
      stationId: z.number().optional(),
      title: z.string(),
      description: z.string(),
      category: z.enum(['technical', 'billing', 'operational', 'maintenance', 'other']).default('other'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    })).mutation(async ({ input, ctx }) => {
      const ticketNumber = `TKT-${String(Date.now()).slice(-6)}`;
      await db.createTicket({ ...input, ticketNumber, raisedByUserId: ctx.user.id, status: 'open' } as any);
      return { success: true, ticketNumber };
    }),
    
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      assignedToUserId: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.status === 'resolved') updateData.resolvedAt = new Date();
      if (data.status === 'closed') updateData.closedAt = new Date();
      await db.updateTicket(id, updateData);
      return { success: true };
    }),
    
    addComment: protectedProcedure.input(z.object({
      ticketId: z.number(),
      comment: z.string(),
      isInternal: z.boolean().optional().default(false),
    })).mutation(async ({ input, ctx }) => {
      await db.addTicketComment({ ...input, userId: ctx.user.id } as any);
      return { success: true };
    }),
  }),

  // ─── Invoices ──────────────────────────────────────────────────────────────

  invoices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (['admin', 'owner'].includes(ctx.user.role)) return db.getAllInvoices();
      return db.getAllInvoices(ctx.user.id);
    }),
    
    create: adminProcedure.input(z.object({
      toStationId: z.number().optional(),
      toUserId: z.number().optional(),
      clientName: z.string(),
      clientEmail: z.string().email().optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      })),
      subtotal: z.string(),
      taxAmount: z.string().optional().default('0'),
      totalAmount: z.string(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const invoiceNumber = `INV-${String(Date.now()).slice(-8)}`;
      await db.createInvoice({
        ...input,
        invoiceNumber,
        fromUserId: ctx.user.id,
        items: input.items,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        status: 'draft',
      } as any);
      return { success: true, invoiceNumber };
    }),
    
    updateStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
    })).mutation(async ({ input }) => {
      const updateData: any = { status: input.status };
      if (input.status === 'sent') updateData.sentAt = new Date();
      if (input.status === 'paid') updateData.paidAt = new Date();
      await db.updateInvoice(input.id, updateData);
      return { success: true };
    }),
  }),

  // ─── Credit Notes ──────────────────────────────────────────────────────────

  creditNotes: router({
    list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
      return db.getCreditNotes(input.stationId);
    }),
    
    create: managerProcedure.input(z.object({
      stationId: z.number(),
      creditAccountId: z.number().optional(),
      customerName: z.string(),
      amount: z.string(),
      reason: z.string(),
      relatedTransactionId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const creditNoteNumber = `CN-${String(Date.now()).slice(-8)}`;
      await db.createCreditNote({ ...input, creditNoteNumber, issuedByUserId: ctx.user.id, status: 'draft' } as any);
      return { success: true, creditNoteNumber };
    }),
  }),

  // ─── Reports ───────────────────────────────────────────────────────────────

  reports: router({
    sales: protectedProcedure.input(z.object({
      stationId: z.number(),
      from: z.string(),
      to: z.string(),
    })).query(async ({ input }) => {
      return db.getSalesReport(input.stationId, new Date(input.from), new Date(input.to));
    }),
    
    paymentBreakdown: protectedProcedure.input(z.object({
      stationId: z.number(),
      from: z.string(),
      to: z.string(),
    })).query(async ({ input }) => {
      return db.getPaymentMethodBreakdown(input.stationId, new Date(input.from), new Date(input.to));
    }),
    
    fuelConsumption: protectedProcedure.input(z.object({
      stationId: z.number(),
      from: z.string(),
      to: z.string(),
    })).query(async ({ input }) => {
      return db.getFuelConsumptionReport(input.stationId, new Date(input.from), new Date(input.to));
    }),
    
    transactions: protectedProcedure.input(z.object({
      stationId: z.number(),
      from: z.string(),
      to: z.string(),
    })).query(async ({ input }) => {
      return db.getTransactionsByDateRange(input.stationId, new Date(input.from), new Date(input.to));
    }),
  }),

  // ─── Users ─────────────────────────────────────────────────────────────────

  users: router({
    list: adminProcedure.query(async () => db.getAllUsers()),
    
    update: adminProcedure.input(z.object({
      id: z.number(),
      role: z.enum(['admin', 'owner', 'manager', 'supervisor', 'accountant', 'technician', 'attendant', 'user']).optional(),
      stationId: z.number().optional(),
      isActive: z.boolean().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateUser(id, data as any);
      await db.writeAuditLog({ userId: ctx.user.id, action: 'update_user', entity: 'users', entityId: id, after: data, ipAddress: ctx.req.ip });
      return { success: true };
    }),
  }),

  // ─── Notifications ─────────────────────────────────────────────────────────

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotificationsForUser(ctx.user.id);
    }),
    
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),
  }),

  // ─── Audit Logs ────────────────────────────────────────────────────────────

  auditLogs: router({
    list: adminProcedure.input(z.object({
      stationId: z.number().optional(),
      userId: z.number().optional(),
      limit: z.number().min(1).max(200).optional().default(100),
      offset: z.number().optional().default(0),
    })).query(async ({ input }) => {
      return db.getAuditLogs(input);
    }),
  }),

  // ─── Scheduled Task Endpoint ───────────────────────────────────────────────

  scheduled: router({
    tankUpdate: webhookProcedure.input(z.object({
      stationId: z.number(),
      readings: z.array(z.object({ tankId: z.number(), level: z.string() })),
    })).mutation(async ({ input }) => {
      for (const r of input.readings) {
        await db.updateTankLevel(r.tankId, r.level, 'atg');
      }
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
