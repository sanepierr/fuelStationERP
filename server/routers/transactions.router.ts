import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

function generateReceiptNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = nanoid(6).toUpperCase();
  return `RCP${y}${m}${d}-${rand}`;
}

export const transactionsRouter = router({
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
  })).mutation(async ({ input, ctx }) => {
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

    const txData = { ...input, receiptNumber, uraVerificationCode: uraCode, qrCode } as any;

    if (input.transactionType === 'fuel_sale' && input.pumpId && input.fuelVolume) {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { pumps, tanks } = await import('../../drizzle/schema');
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
});
