import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const rttRouter = router({
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
    const rttNumber = `RTT-${nanoid(8).toUpperCase()}`;
    await db.createRttTransaction({ ...input, rttNumber, technicianId: ctx.user.id, status: 'pending' } as any);
    return { success: true, rttNumber };
  }),

  approve: managerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    const { rttTransactions } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    await dbConn.update(rttTransactions).set({ status: 'approved', approvedByUserId: ctx.user.id, approvedAt: new Date() }).where(eq(rttTransactions.id, input.id));
    return { success: true };
  }),
});
