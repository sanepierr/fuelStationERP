import { z } from "zod";
import { adminProcedure, managerProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { cameras, cameraEvents, cameraRecordings, cameraZones } from "../../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

export const camerasRouter = router({
  list: protectedProcedure.input(z.object({ stationId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(cameras).where(eq(cameras.stationId, input.stationId)).orderBy(cameras.channelNumber);
  }),

  create: managerProcedure.input(z.object({
    stationId: z.number(),
    name: z.string(),
    channelNumber: z.number(),
    location: z.string().optional(),
    streamUrl: z.string().optional(),
    snapshotUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.insert(cameras).values({ ...input, status: "offline" });
    return { success: true };
  }),

  update: managerProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    location: z.string().optional(),
    streamUrl: z.string().optional(),
    snapshotUrl: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const { id, ...data } = input;
    await db.update(cameras).set(data).where(eq(cameras.id, id));
    return { success: true };
  }),

  updateStatus: managerProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["online", "offline", "fault"]),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.update(cameras).set({ status: input.status }).where(eq(cameras.id, input.id));
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.delete(cameras).where(eq(cameras.id, input.id));
    return { success: true };
  }),
});

export const cameraEventsRouter = router({
  list: protectedProcedure.input(z.object({
    stationId: z.number(),
    cameraId: z.number().optional(),
    limit: z.number().default(50),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(cameraEvents.stationId, input.stationId)];
    if (input.cameraId) conditions.push(eq(cameraEvents.cameraId, input.cameraId));
    return db.select().from(cameraEvents).where(and(...conditions)).orderBy(desc(cameraEvents.createdAt)).limit(input.limit);
  }),

  resolve: managerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.update(cameraEvents).set({ isResolved: true, resolvedAt: new Date() }).where(eq(cameraEvents.id, input.id));
    return { success: true };
  }),
});

export const recordingsRouter = router({
  list: protectedProcedure.input(z.object({
    stationId: z.number(),
    cameraId: z.number().optional(),
    limit: z.number().default(50),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(cameraRecordings.stationId, input.stationId)];
    if (input.cameraId) conditions.push(eq(cameraRecordings.cameraId, input.cameraId));
    return db.select().from(cameraRecordings).where(and(...conditions)).orderBy(desc(cameraRecordings.startTime)).limit(input.limit);
  }),

  star: managerProcedure.input(z.object({ id: z.number(), isStarred: z.boolean() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.update(cameraRecordings).set({ isStarred: input.isStarred }).where(eq(cameraRecordings.id, input.id));
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.delete(cameraRecordings).where(eq(cameraRecordings.id, input.id));
    return { success: true };
  }),
});

export const zonesRouter = router({
  list: protectedProcedure.input(z.object({ cameraId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(cameraZones).where(eq(cameraZones.cameraId, input.cameraId));
  }),

  create: managerProcedure.input(z.object({
    cameraId: z.number(),
    name: z.string(),
    coordinates: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.insert(cameraZones).values({ cameraId: input.cameraId, name: input.name, coordinates: input.coordinates });
    return { success: true };
  }),

  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.delete(cameraZones).where(eq(cameraZones.id, input.id));
    return { success: true };
  }),
});
