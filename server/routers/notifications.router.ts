import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getNotificationsForUser(ctx.user.id);
  }),

  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.markNotificationRead(input.id);
    return { success: true };
  }),
});
