import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

function generateOrderNumber(prefix: string) {
  return `${prefix}-${nanoid(8).toUpperCase()}`;
}

export const deliveriesRouter = router({
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

    if (status === 'delivered' && input.tankLevelAfter) {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { fuelDeliveries } = await import('../../drizzle/schema');
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
});
