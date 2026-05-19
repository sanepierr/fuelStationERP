import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { z } from "zod";
import { ENV } from "./env";
import { logger } from "./logger";
import * as db from "../db";

// ─── PTS Payload Schema ───────────────────────────────────────────────────────

const PtsPacketData = z.object({
  DateTimeStart: z.string(),
  DateTime: z.string(),
  Pump: z.number().int().positive(),
  Nozzle: z.number().int().positive(),
  Transaction: z.number().int(),
  Volume: z.number().nonnegative(),
  TCVolume: z.number().nonnegative().optional(),
  Price: z.number().positive(),
  Amount: z.number().nonnegative(),
  TotalVolume: z.number().nonnegative().optional(),
  TotalAmount: z.number().nonnegative().optional(),
  Tag: z.string().optional(),
  UserId: z.number().int().optional(),
  ConfigurationId: z.string().optional(),
});

const PtsPacket = z.object({
  Id: z.number(),
  Type: z.literal("UploadPumpTransaction"),
  Data: PtsPacketData,
});

const PtsBody = z.object({
  Protocol: z.literal("jsonPTS"),
  PtsId: z.string(),
  Packets: z.array(PtsPacket).min(1),
});

type PtsPacketResult =
  | { Id: number; Type: string; Error: 0 }
  | { Id: number; Type: string; Error: number; Description: string };

// ─── Receipt helpers (mirrors transactions.router.ts) ─────────────────────────

function generateReceiptNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `RCP${y}${m}${day}-${nanoid(6).toUpperCase()}`;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

function validatePtsAuth(req: Request): boolean {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return !!ENV.webhookSecret && token === ENV.webhookSecret;
}

// ─── Per-packet processor ─────────────────────────────────────────────────────

async function processPacket(
  packet: z.infer<typeof PtsPacket>,
  ptsId: string,
  stationId: number
): Promise<PtsPacketResult> {
  const { Data } = packet;

  // Unique key: <ptsId>:<pump>:<transactionSequenceNumber>
  const ptsTransactionId = `${ptsId}:${Data.Pump}:${Data.Transaction}`;

  // Idempotency — if we've already processed this transaction, return success
  const existing = await db.getTransactionByPtsId(ptsTransactionId);
  if (existing) {
    logger.info("pts: duplicate transaction skipped", { ptsTransactionId });
    return { Id: packet.Id, Type: packet.Type, Error: 0 };
  }

  // Resolve the internal pump record from PTS pump number
  const pump = await db.getPumpByStationAndNumber(stationId, Data.Pump);
  if (!pump) {
    logger.warn("pts: pump not found", { stationId, ptsNumber: Data.Pump });
    return {
      Id: packet.Id,
      Type: packet.Type,
      Error: 404,
      Description: `Pump ${Data.Pump} not found for station ${stationId}`,
    };
  }

  // Look up the active shift for this station (optional — attach if present)
  const activeShift = await db.getActiveShift(stationId);

  // Resolve loyalty customer from Tag if present
  let loyaltyCustomer: Awaited<ReturnType<typeof db.getLoyaltyCustomerByCard>> = undefined;
  if (Data.Tag) {
    loyaltyCustomer = await db.getLoyaltyCustomerByCard(Data.Tag);
  }

  // Generate receipt and URA code
  const receiptNumber = generateReceiptNumber();
  const uraCode = `URA-${nanoid(12).toUpperCase()}`;
  const qrCode = await QRCode.toDataURL(
    JSON.stringify({
      receipt: receiptNumber,
      ura: uraCode,
      station: stationId,
      amount: Data.Amount.toFixed(2),
      date: new Date(Data.DateTime).toISOString(),
    })
  );

  const txData = {
    receiptNumber,
    uraVerificationCode: uraCode,
    qrCode,
    stationId,
    pumpId: pump.id,
    shiftId: activeShift?.id,
    attendantId: undefined,
    customerId: loyaltyCustomer?.id,
    loyaltyCardId: Data.Tag ?? null,
    transactionType: "fuel_sale" as const,
    paymentMethod: "cash" as const,        // PTS doesn't carry payment method; default to cash, update via UI if needed
    fuelTypeId: pump.tankId ? undefined : undefined, // resolved via tank below
    fuelVolume: Data.Volume.toFixed(3),
    tcVolume: (Data.TCVolume ?? Data.Volume).toFixed(3),
    pricePerUnit: Data.Price.toFixed(2),
    subtotal: Data.Amount.toFixed(2),
    totalAmount: Data.Amount.toFixed(2),
    taxAmount: "0",
    discountAmount: "0",
    loyaltyPointsEarned: 0,
    loyaltyPointsRedeemed: 0,
    ptsTransactionId,
    ptsPumpNumber: Data.Pump,
    ptsNozzle: Data.Nozzle,
    ptsTotalizerVolume: Data.TotalVolume != null ? Data.TotalVolume.toFixed(3) : null,
    ptsTotalizerAmount: Data.TotalAmount != null ? Data.TotalAmount.toFixed(2) : null,
    transactedAt: new Date(Data.DateTime),
    status: "completed" as const,
  };

  // Fetch tank linked to the pump and compute new level
  try {
    const dbConn = await db.getDb();
    if (!dbConn) throw new Error("DB not available");

    const { tanks } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const tankRows = await dbConn.select().from(tanks).where(eq(tanks.id, pump.tankId)).limit(1);
    const tank = tankRows[0];

    if (tank) {
      // Attach fuelTypeId from the tank
      (txData as any).fuelTypeId = tank.fuelTypeId;

      const newLevel = Math.max(
        0,
        parseFloat(tank.currentLevel) - Data.Volume
      ).toFixed(2);

      await db.createTransactionWithTankUpdate(txData as any, tank.id, newLevel);
    } else {
      await db.createTransaction(txData as any);
    }

    // Update pump totalizer to match PTS running total
    if (Data.TotalVolume != null) {
      await db.updatePumpTotalizer(pump.id, Data.TotalVolume.toFixed(3));
    }

    logger.info("pts: transaction created", { ptsTransactionId, receiptNumber, amount: Data.Amount });
    return { Id: packet.Id, Type: packet.Type, Error: 0 };
  } catch (err) {
    logger.error("pts: failed to create transaction", {
      ptsTransactionId,
      error: String(err),
    });
    return {
      Id: packet.Id,
      Type: packet.Type,
      Error: 500,
      Description: "Internal error while recording transaction",
    };
  }
}

// ─── Route registrar ──────────────────────────────────────────────────────────

export function registerPtsWebhook(app: Express) {
  /**
   * POST /api/pts/createPumpTransaction
   *
   * Accepts the jsonPTS UploadPumpTransaction payload from a forecourt
   * controller and records each packet as a fuel_sale transaction.
   *
   * Auth: Bearer <WEBHOOK_SECRET> in Authorization header
   *       or X-Webhook-Secret header (same secret, alternate header)
   *
   * The stationId is resolved from the PtsId query param or body:
   *   ?stationId=<n>  (required)
   */
  app.post("/api/pts/createPumpTransaction", async (req: Request, res: Response) => {
    // Auth: Accept Bearer token OR the X-Webhook-Secret header
    const xSecret = req.headers["x-webhook-secret"];
    const authOk = validatePtsAuth(req) || (!!ENV.webhookSecret && xSecret === ENV.webhookSecret);
    if (!authOk) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // stationId must be supplied as a query param since it's not in the PTS payload
    const stationId = parseInt((req.query.stationId as string) ?? "");
    if (!stationId || isNaN(stationId)) {
      res.status(400).json({ error: "stationId query parameter is required" });
      return;
    }

    // Validate body shape
    const parsed = PtsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid PTS payload", details: parsed.error.flatten() });
      return;
    }

    const { PtsId, Packets } = parsed.data;

    // Process all packets and collect per-packet results
    const results: PtsPacketResult[] = [];
    for (const packet of Packets) {
      // Only handle UploadPumpTransaction (already enforced by Zod, but guard for future types)
      if (packet.Type !== "UploadPumpTransaction") {
        results.push({ Id: packet.Id, Type: packet.Type, Error: 0 });
        continue;
      }
      const result = await processPacket(packet, PtsId, stationId);
      results.push(result);
    }

    // PTS expects the same Protocol/PtsId echoed back with per-packet results
    res.status(200).json({
      Protocol: "jsonPTS",
      PtsId,
      Packets: results,
    });
  });
}
