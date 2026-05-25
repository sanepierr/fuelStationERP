import { z } from "zod";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pumpPriceChanges, fuelPrices, fuelTypes, pumps } from "../../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { setFuelPrice } from "../db";

export const priceChangesRouter = router({
  list: protectedProcedure.input(z.object({
    stationId: z.number(),
    fuelTypeId: z.number().optional(),
    limit: z.number().default(50),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(pumpPriceChanges.stationId, input.stationId)];
    if (input.fuelTypeId) conditions.push(eq(pumpPriceChanges.fuelTypeId, input.fuelTypeId));
    return db
      .select()
      .from(pumpPriceChanges)
      .where(and(...conditions))
      .orderBy(desc(pumpPriceChanges.createdAt))
      .limit(input.limit);
  }),

  currentPrice: protectedProcedure.input(z.object({
    stationId: z.number(),
    fuelTypeId: z.number(),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    // Latest price change takes precedence
    const [latest] = await db
      .select()
      .from(pumpPriceChanges)
      .where(and(eq(pumpPriceChanges.stationId, input.stationId), eq(pumpPriceChanges.fuelTypeId, input.fuelTypeId)))
      .orderBy(desc(pumpPriceChanges.createdAt))
      .limit(1);
    if (latest) return { pricePerUnit: latest.newPrice, source: "price_change" as const };
    // Fall back to fuel_prices
    const [fp] = await db
      .select()
      .from(fuelPrices)
      .where(and(eq(fuelPrices.stationId, input.stationId), eq(fuelPrices.fuelTypeId, input.fuelTypeId), eq(fuelPrices.isActive, true)))
      .limit(1);
    return fp ? { pricePerUnit: fp.pricePerUnit, source: "fuel_prices" as const } : null;
  }),

  create: managerProcedure.input(z.object({
    stationId: z.number(),
    pumpId: z.number().optional(),
    fuelTypeId: z.number(),
    oldPrice: z.string(),
    newPrice: z.string(),
    reason: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db.insert(pumpPriceChanges).values({
      stationId: input.stationId,
      pumpId: input.pumpId,
      fuelTypeId: input.fuelTypeId,
      oldPrice: input.oldPrice,
      newPrice: input.newPrice,
      reason: input.reason,
      changedByUserId: ctx.user.id,
      changedByName: ctx.user.name ?? undefined,
      effectiveAt: new Date(),
    });

    // Update active fuel_prices record
    await setFuelPrice({
      stationId: input.stationId,
      fuelTypeId: input.fuelTypeId,
      pricePerUnit: input.newPrice,
      setByUserId: ctx.user.id,
    });

    return { success: true };
  }),
});
