import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, message: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...data,
  };
  const out = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    process.stderr.write(out + "\n");
  } else {
    process.stdout.write(out + "\n");
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const start = Date.now();
  (req as any).requestId = requestId;

  res.on("finish", () => {
    logger.info("request", {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });

  next();
}
