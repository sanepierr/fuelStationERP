import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => db.getDashboardStats()),
  multiStation: protectedProcedure.query(async () => db.getMultiStationDashboard()),
});
