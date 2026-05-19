import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const reportsRouter = router({
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
});
