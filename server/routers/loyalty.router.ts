import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const loyaltyRouter = router({
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
});
