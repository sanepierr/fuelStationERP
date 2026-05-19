import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const tanksRouter = router({
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
    const { tanks } = await import('../../drizzle/schema');
    await dbConn.insert(tanks).values(input as any);
    return { success: true };
  }),
});
