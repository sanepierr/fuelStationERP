import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const stationsRouter = router({
  list: protectedProcedure.query(async () => db.getAllStations()),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const station = await db.getStationById(input.id);
    if (!station) throw new TRPCError({ code: 'NOT_FOUND' });
    return station;
  }),

  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional().default('Uganda'),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    tinNumber: z.string().optional(),
    licenseNumber: z.string().optional(),
    hikVisionHost: z.string().optional(),
    atgHost: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    await db.createStation(input as any);
    await db.writeAuditLog({ userId: ctx.user.id, action: 'create_station', entity: 'stations', after: { name: input.name, code: input.code }, ipAddress: ctx.req.ip });
    return { success: true };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    hikVisionHost: z.string().optional(),
    hikVisionUsername: z.string().optional(),
    hikVisionPassword: z.string().optional(),
    atgHost: z.string().optional(),
    atgPort: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    await db.updateStation(id, data as any);
    const { hikVisionPassword: _pw, ...auditData } = data;
    await db.writeAuditLog({ userId: ctx.user.id, action: 'update_station', entity: 'stations', entityId: id, after: auditData, ipAddress: ctx.req.ip });
    return { success: true };
  }),
});
