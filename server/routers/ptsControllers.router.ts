import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import * as db from "../db";

export const ptsControllersRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllPtsControllers();
  }),

  upsert: adminProcedure
    .input(z.object({
      ptsId: z.string().min(1).max(64),
      stationId: z.number().int().positive(),
      label: z.string().max(128).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertPtsController(input);
      return db.getPtsControllerByPtsId(input.ptsId);
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      label: z.string().max(128).optional(),
      stationId: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updatePtsController(id, data);
    }),
});
