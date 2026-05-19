import { z } from "zod";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const productsRouter = router({
  list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
    return db.getProductsForStation(input.stationId);
  }),

  create: managerProcedure.input(z.object({
    stationId: z.number(),
    name: z.string(),
    sku: z.string().optional(),
    category: z.enum(['gas', 'lubes', 'tyres', 'accessories', 'food', 'other']).default('other'),
    unit: z.string().default('unit'),
    sellingPrice: z.string(),
    costPrice: z.string().optional(),
    stockQuantity: z.string().optional().default('0'),
    minStockLevel: z.string().optional().default('0'),
  })).mutation(async ({ input }) => {
    await db.createProduct(input as any);
    return { success: true };
  }),

  update: managerProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    sellingPrice: z.string().optional(),
    stockQuantity: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateProduct(id, data as any);
    return { success: true };
  }),
});
