import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const ticketsRouter = router({
  list: protectedProcedure.input(z.object({
    status: z.string().optional(),
    stationId: z.number().optional(),
    limit: z.number().optional().default(100),
    offset: z.number().optional().default(0),
  })).query(async ({ input }) => {
    return db.getAllTickets(input);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const ticket = await db.getTicketById(input.id);
    if (!ticket) throw new TRPCError({ code: 'NOT_FOUND' });
    const comments = await db.getTicketComments(input.id);
    return { ...ticket, comments };
  }),

  create: protectedProcedure.input(z.object({
    stationId: z.number().optional(),
    title: z.string(),
    description: z.string(),
    category: z.enum(['technical', 'billing', 'operational', 'maintenance', 'other']).default('other'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  })).mutation(async ({ input, ctx }) => {
    const ticketNumber = `TKT-${String(Date.now()).slice(-6)}`;
    await db.createTicket({ ...input, ticketNumber, raisedByUserId: ctx.user.id, status: 'open' } as any);
    return { success: true, ticketNumber };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    assignedToUserId: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    const updateData: any = { ...data };
    if (data.status === 'resolved') updateData.resolvedAt = new Date();
    if (data.status === 'closed') updateData.closedAt = new Date();
    await db.updateTicket(id, updateData);
    return { success: true };
  }),

  addComment: protectedProcedure.input(z.object({
    ticketId: z.number(),
    comment: z.string(),
    isInternal: z.boolean().optional().default(false),
  })).mutation(async ({ input, ctx }) => {
    await db.addTicketComment({ ...input, userId: ctx.user.id } as any);
    return { success: true };
  }),
});
