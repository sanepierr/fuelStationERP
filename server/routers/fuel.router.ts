import { z } from "zod";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

// Exported so routers/index.ts can compose it
export const fuelTypesRouter = router({
  list: protectedProcedure.query(async () => db.getAllFuelTypes()),
});

export const fuelPricesRouter = router({
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
});
