import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const invoicesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (['admin', 'owner'].includes(ctx.user.role)) return db.getAllInvoices();
    return db.getAllInvoices(ctx.user.id);
  }),

  create: adminProcedure.input(z.object({
    toStationId: z.number().optional(),
    toUserId: z.number().optional(),
    clientName: z.string(),
    clientEmail: z.string().email().optional(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })),
    subtotal: z.string(),
    taxAmount: z.string().optional().default('0'),
    totalAmount: z.string(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const invoiceNumber = `INV-${String(Date.now()).slice(-8)}`;
    await db.createInvoice({
      ...input,
      invoiceNumber,
      fromUserId: ctx.user.id,
      items: input.items,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      status: 'draft',
    } as any);
    return { success: true, invoiceNumber };
  }),

  updateStatus: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  })).mutation(async ({ input }) => {
    const updateData: any = { status: input.status };
    if (input.status === 'sent') updateData.sentAt = new Date();
    if (input.status === 'paid') updateData.paidAt = new Date();
    await db.updateInvoice(input.id, updateData);
    return { success: true };
  }),
});
