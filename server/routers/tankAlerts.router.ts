import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tanks, stations, fuelTypes } from "../../drizzle/schema";
import { or, eq } from "drizzle-orm";

export const tankAlertsRouter = router({
  list: protectedProcedure.input(z.object({ stationId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: tanks.id,
        name: tanks.name,
        stationId: tanks.stationId,
        stationName: stations.name,
        fuelTypeName: fuelTypes.name,
        currentLevel: tanks.currentLevel,
        capacity: tanks.capacity,
        minLevel: tanks.minLevel,
        status: tanks.status,
      })
      .from(tanks)
      .leftJoin(stations, eq(tanks.stationId, stations.id))
      .leftJoin(fuelTypes, eq(tanks.fuelTypeId, fuelTypes.id))
      .where(
        input?.stationId
          ? eq(tanks.stationId, input.stationId)
          : or(eq(tanks.status, "low"), eq(tanks.status, "critical"))
      );

    // If stationId scoped, still filter to alerts only
    if (input?.stationId) {
      return rows.filter(r => r.status === "low" || r.status === "critical");
    }
    return rows;
  }),
});
