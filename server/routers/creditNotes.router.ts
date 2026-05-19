import { z } from "zod";
import { managerProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const creditNotesRouter = router({
  list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
    return db.getCreditNotes(input.stationId);
  }),

  create: managerProcedure.input(z.object({
    stationId: z.number(),
    creditAccountId: z.number().optional(),
    customerName: z.string(),
    amount: z.string(),
    reason: z.string(),
    relatedTransactionId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const creditNoteNumber = `CN-${String(Date.now()).slice(-8)}`;
    await db.createCreditNote({ ...input, creditNoteNumber, issuedByUserId: ctx.user.id, status: 'draft' } as any);
    return { success: true, creditNoteNumber };
  }),
});
