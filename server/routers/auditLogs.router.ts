import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const auditLogsRouter = router({
  list: adminProcedure.input(z.object({
    stationId: z.number().optional(),
    userId: z.number().optional(),
    limit: z.number().min(1).max(200).optional().default(100),
    offset: z.number().optional().default(0),
  })).query(async ({ input }) => {
    return db.getAuditLogs(input);
  }),
});
