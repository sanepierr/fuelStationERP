import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const attendantsRouter = router({
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
    const { pumpAttendants } = await import('../../drizzle/schema');
    await dbConn.insert(pumpAttendants).values({ ...input, userId: input.userId ?? 0, assignedPumps: input.assignedPumps || [] } as any);
    return { success: true };
  }),

  toggleActive: managerProcedure.input(z.object({ id: z.number(), isActive: z.boolean() })).mutation(async ({ input }) => {
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    const { pumpAttendants } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    await dbConn.update(pumpAttendants).set({ isActive: input.isActive }).where(eq(pumpAttendants.id, input.id));
    return { success: true };
  }),
});
