import { z } from "zod";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const shiftsRouter = router({
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
});
