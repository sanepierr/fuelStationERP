import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const usersRouter = router({
  list: adminProcedure.query(async () => db.getAllUsers()),

  update: adminProcedure.input(z.object({
    id: z.number(),
    role: z.enum(['super_admin', 'company_owner', 'company_admin', 'manager', 'supervisor', 'accountant', 'technician', 'attendant', 'user']).optional(),
    stationId: z.number().optional(),
    isActive: z.boolean().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    await db.updateUser(id, data as any);
    await db.writeAuditLog({ userId: ctx.user.id, action: 'update_user', entity: 'users', entityId: id, after: data, ipAddress: ctx.req.ip });
    return { success: true };
  }),
});
