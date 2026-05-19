import { z } from "zod";
import { router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";
import * as db from "../db";

const webhookProcedure = publicProcedure.use(({ ctx, next }) => {
  const secret = ENV.webhookSecret;
  if (!secret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Webhook secret not configured' });
  const supplied = ctx.req.headers['x-webhook-secret'];
  if (!supplied || supplied !== secret) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid webhook secret' });
  return next({ ctx });
});

export const scheduledRouter = router({
  tankUpdate: webhookProcedure.input(z.object({
    stationId: z.number(),
    readings: z.array(z.object({ tankId: z.number(), level: z.string() })),
  })).mutation(async ({ input }) => {
    for (const r of input.readings) {
      await db.updateTankLevel(r.tankId, r.level, 'atg');
    }
    return { success: true };
  }),
});
