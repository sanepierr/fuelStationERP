import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const pumpsRouter = router({
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
    const { pumps } = await import('../../drizzle/schema');
    await dbConn.insert(pumps).values(input as any);
    return { success: true };
  }),
});
